---
summary: "多帐户布局、私人家庭服务器、代理、配置文件和目标解析"
read_when:
  - "在一个网关上运行多个 Matrix 账户"
  - "连接到 LAN 或自托管 Matrix 家庭服务器"
  - "修复漂移的 Matrix 直接消息映射"
title: "Matrix 帐户和家庭服务器"
sidebarTitle: "帐户和家庭服务器"
---

帐户布局、家庭服务器可达性和目标表单OpenClaw接受为Matrix房间和用户。

## <a id="profile-management"></a> 个人资料管理

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

在一次调用中传递两个选项。 Matrix 直接接受`mxc://`头像URL；传递 `http://`/`https://` 首先上传文件并将解析的 `mxc://` URL 存储到 `channels.matrix.avatarUrl` （或每个帐户覆盖）。

## <a id="direct-room-repair"></a> 直接房间修复

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

映射更新在写入之前读取现有帐户数据。如果读取失败，更新将停止，而不替换现有映射。帐户数据读取恢复后重试修复。

## <a id="multi-account"></a> 多账户

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

- 设置 `defaultAccount` 以选择隐式路由、检查和 CLI 命令首选的命名帐户。
- 如果你有多个账户，并且其中一个确实名为 `default`，即使未设置 `defaultAccount`，OpenClaw 也会隐式使用它。
- 如果存在多个命名账户但未选择默认账户，CLI 命令将拒绝猜测——请设置 `defaultAccount` 或传入 `--account <id>`。
- 顶级`channels.matrix.*`块仅在其身份验证完成时被视为隐式`default`帐户（`homeserver` + `accessToken`，或`homeserver` + `userId` + `password`）。一旦缓存的凭据覆盖身份验证，命名帐户仍然可以从 `homeserver` + `userId` 中发现。

**提升：**

- 当 OpenClaw 在修复或设置期间将单帐户配置提升为多帐户时，如果存在或 `defaultAccount` 已指向一个帐户，它将保留现有的命名帐户。只有 Matrix auth/bootstrap 密钥才会移入升级帐户；共享的交付策略密钥保留在顶层。

有关共享的多账户模式，请参见[配置参考](/gateway/config-channels#multi-account-all-channels)。

## <a id="private%2Flan-homeservers"></a><a id="private/lan-homeservers"></a> Private/LAN 家庭服务器

默认情况下，OpenClaw 会阻止 private/internal Matrix 家庭服务器以实现 SSRF 保护，除非您选择按帐户加入。

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

此选择仅允许受信任的 private/internal 目标。公共明文家庭服务器（例如 `http://matrix.example.org:8008`）仍然被阻止。尽可能首选 `https://`。

## <a id="proxying-matrix-traffic"></a> 代理 Matrix 流量

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

命名帐户可以使用 `channels.matrix.accounts.<id>.proxy` 覆盖顶级默认值。 OpenClaw 使用相同的代理设置进行运行时 Matrix 流量和帐户状态检查。

## <a id="target-resolution"></a> 目标解析

Matrix 在 OpenClaw 需要房间或用户目标的任何地方都接受以下目标形式：

- 用户：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房间：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`（房间版本 12+ 房间 ID 没有 `:server` 后缀 — `!room`、`room:!room`、`matrix:room:!room` — 并且是以同样的方式接受）
- 别名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

Matrix 房间 ID 区分大小写。配置显式传送目标、cron 作业、绑定或白名单时，请使用 Matrix 中的确切房间 ID 大小写。 OpenClaw 将内部会话密钥标准化为小写以便存储，因此这些小写密钥不是 Matrix 传递 ID 的可靠来源。

配置支持的对等和组列表使用所选帐户的允许列表和配置的房间，而无需加载存储的 Matrix 凭据。

实时目录查询使用已登录的 Matrix 账户：

- 用户查找会查询该 homeserver 上的 Matrix 用户目录。
- 房间查找直接接受显式房间 ID 和别名。加入的房间名称查找是尽力而为的，并且仅在设置 `dangerouslyAllowNameMatching: true` 时适用于运行时房间允许列表。
- 如果房间名称无法解析为 ID 或别名，则会在运行时允许名单解析中忽略它。
