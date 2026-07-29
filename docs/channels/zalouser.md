---
summary: "通过原生 zca-js（二维码登录）支持 Zalo 个人账号、能力与配置"
read_when:
  - 为 OpenClaw 设置 Zalo Personal
  - 调试 Zalo Personal 登录或消息流
title: "Zalo 个人版"
---

状态：实验性。此集成通过原生 `zca-js`、在进程内、且无需外部 CLI 二进制文件来自动化一个 **Zalo 个人账号**。

<Warning>
这是一个非官方集成，可能导致账号被暂停或封禁。请自行承担风险。
</Warning>

## 安装

Zalo Personal 是一个官方外部插件，不包含在核心中。请先安装后再使用：

```bash
openclaw plugins install @openclaw/zalouser
```

- 固定版本：`openclaw plugins install @openclaw/zalouser@<version>`
- 从源代码检出安装：`openclaw plugins install ./path/to/local/zalouser-plugin`
- 详情：[插件](/tools/plugin)

## 快速设置

1. 安装插件（见上文）。
2. 登录（QR，在 Gateway 机器上）：
   - `openclaw channels login --channel zalouser`
   - 使用 Zalo 手机应用扫描二维码。
3. 启用该通道：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

4. 重启 Gateway（或完成设置）。
5. DM 访问默认是 pairing；首次联系时请在配对码上批准。

## 它是什么

- 完全通过 `zca-js` 库在进程内运行（不需要外部 `zca`/`openzca` 二进制文件）。
- 使用原生事件监听器（`message`、`error`）接收传入消息。
- 直接通过 JS API 发送回复（文本/媒体/链接）。
- 面向“个人账号”使用场景设计，在这些场景中无法使用 Zalo Bot API。

## 命名

Channel id 是 `zalouser`，以明确表示这会自动化一个**个人 Zalo 用户账号**（非官方）。`zalo` 保留给未来可能的官方 Zalo API 集成。

## 查找 ID（目录）

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## 限制

- 出站文本按 2000 个字符分块（Zalo 客户端限制）。
- 不支持流式传输。
- 已完成的入站消息 ID 保留 30 天，每个账户最多保留最近的 1000 条记录。

## 入站持久性

OpenClaw 会在处理每个原始 `zca-js` 消息回调之前先将其存储起来。待处理消息会在 Gateway 重启后从账户队列中恢复，并且对于每个私聊或群聊，处理过程都会保持串行化。

`zca-js` 套接字监听器不会提供投递确认，也不会在重新连接后自动重放旧消息。因此，持久化队列保护的是回调到达 OpenClaw 之后的本地崩溃窗口；对于套接字从未投递到的消息，它无法进行恢复。重放墓碑记录主要用于防止同一条 Zalo 消息 ID 的重复回调。

## 访问控制（私信）

`channels.zalouser.dmPolicy`: `pairing | allowlist | open | disabled`（默认：`pairing`）。

`channels.zalouser.allowFrom` 应使用稳定的 Zalo 用户 ID。它也可以引用静态发送者访问组（`accessGroup:<name>`）。在交互式设置期间，输入的名称可以通过插件的进程内联系人查找解析为 ID。

如果原始名称仍保留在配置中，仅当启用 `channels.zalouser.dangerouslyAllowNameMatching: true` 时，启动才会解析它。若不启用该选项，运行时发送者检查仅基于 ID，原始名称会被忽略，不用于授权。

通过以下方式批准：

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## 群组访问（可选）

- 默认：`channels.zalouser.groupPolicy = "allowlist"`（群组需要显式的 allowlist 条目）。
- 打开所有群组：`channels.zalouser.groupPolicy = "open"`。
- 屏蔽所有群组：`channels.zalouser.groupPolicy = "disabled"`。
- 当 `groupPolicy = "allowlist"` 时：
  - `channels.zalouser.groups` 的键应为稳定的群组 ID；仅当启用 `channels.zalouser.dangerouslyAllowNameMatching: true` 时，名称才会在启动时解析为 ID。
  - `channels.zalouser.groupAllowFrom` 控制允许的群组中哪些发送者可以触发机器人；静态发送者访问组可通过 `accessGroup:<name>` 引用。
- 配置向导可以提示输入群组 allowlist。
- 群组 allowlist 的匹配默认仅按 ID 进行。除非启用 `channels.zalouser.dangerouslyAllowNameMatching: true`，否则无法解析的名称会在认证时被忽略。
- `channels.zalouser.dangerouslyAllowNameMatching: true` 是一种破窗兼容模式，会重新启用可变的启动时名称解析和运行时群组名匹配。
- 对于普通群组消息，`groupAllowFrom` **不会** 回退到 `allowFrom`：如果在一个已列入 allowlist 的群组中将其留空，则该群组对任意发送者开放。已授权的控制命令（例如 `/new`）是例外；当 `groupAllowFrom` 为空时，命令发送者检查会回退到 `allowFrom`。

示例：

```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["1471383327500481391"],
      groups: {
        "123456789": { enabled: true },
        "Work Chat": { enabled: true },
      },
    },
  },
}
```

<Note>
`channels.zalouser.groups.<id>.allow` 是一个旧字段名；当前配置使用 `enabled`。`openclaw doctor --fix` 会自动将 `allow` 迁移为 `enabled`。
</Note>

### 群组提及门控

- `channels.zalouser.groups.<group>.requireMention` 控制群组回复是否需要提及。
- 解析顺序：group id -> `group:<id>` 别名 -> 群组名称/slug（基于名称的候选项仅在 `dangerouslyAllowNameMatching: true` 时适用）-> `*` -> 默认值（`true`）。
- 同时适用于 allowlist 群组和开放群组模式。
- 引用机器人的消息会被视为对群组激活的隐式提及。
- 已授权的控制命令（例如 `/new`）可以绕过提及门控。
- 当群组消息因需要提及而被跳过时，OpenClaw 会将其作为待处理的群组历史保存，并在下一条已处理的群组消息中包含它。
- 群组历史上限：`channels.zalouser.historyLimit`，然后是 `messages.groupChat.historyLimit`，最后的回退值为 `50`。

示例：

```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groups: {
        "*": { enabled: true, requireMention: true },
        "Work Chat": { enabled: true, requireMention: false },
      },
    },
  },
}
```

## 多账户

该账户在 OpenClaw 状态中映射到 `zalouser` 配置文件。示例：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      defaultAccount: "default",
      accounts: {
        work: { enabled: true, profile: "work" },
      },
    },
  },
}
```

## 环境变量

配置文件中的 profile 选择也可以来自环境变量：

| 变量               | 作用                                                                       |
| ------------------ | -------------------------------------------------------------------------- |
| `ZALOUSER_PROFILE` | 当 channel 或 account 配置中未设置 `profile` 时使用的 profile 名称。 |
| `ZCA_PROFILE`      | 旧版回退选项，仅在未设置 `ZALOUSER_PROFILE` 时使用。             |

Profile 名称用于选择 OpenClaw 状态中保存的 Zalo 登录凭据。解析顺序如下：

1. 配置中的显式 `profile`。
2. `ZALOUSER_PROFILE`。
3. `ZCA_PROFILE`。
4. 非默认账号使用账号 id，默认账号使用 `default`。

对于多账号设置，建议在配置中为每个账号单独设置 `profile`，这样一个环境变量不会让多个账号共享同一个登录会话。

## 打字、反应与送达确认

- OpenClaw 会在发送回复前先发送一个输入中事件（尽力而为）。
- 通道操作中支持 `zalouser` 的消息反应动作 `react`。
  - 使用 `remove: true` 可从消息中移除特定反应表情。
  - 反应语义：[反应](/tools/reactions)
- 对于包含事件元数据的入站消息，OpenClaw 会发送已送达 + 已查看确认（尽力而为）。

## 故障排除

**登录无法保持：**

- `openclaw channels status --probe`
- 重新登录：`openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**允许列表/群组名称未解析：**

- 在 `allowFrom`/`groupAllowFrom` 中使用数字 ID，并在 `groups` 中使用稳定的群组 ID。如果你有意需要精确的好友/群组名称，请启用 `channels.zalouser.dangerouslyAllowNameMatching: true`。

**从旧的外部 `zca`/基于 CLI 的设置升级：**

- 移除任何对外部 `zca` 进程的假设；该通道现在通过 `zca-js` 完全在进程内运行，不再需要外部 CLI 二进制文件。

## 相关内容

- [Channels 概览](/channels) - 所有支持的渠道
- [配对](/channels/pairing) - DM 认证和配对流程
- [群组](/channels/groups) - 群聊行为和提及门控
- [渠道路由](/channels/channel-routing) - 消息的会话路由
- [安全](/gateway/security) - 访问模型和加固
