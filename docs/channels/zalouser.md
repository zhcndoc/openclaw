---
summary: "通过本机 zca-js（QR 登录）、功能和配置支持 Zalo 个人帐户"
read_when:
  - "为 OpenClaw 设置 Zalo 个人版"
  - "调试 Zalo Personal 登录或消息流"
title: "Zalo 个人版"
---

状态：实验性的。此集成通过本机 `zca-js` 在进程内自动生成 **个人 Zalo 帐户**，无需外部 CLI 二进制文件。

<Warning>
这是一个非官方集成，可能导致账号被暂停或封禁。请自行承担风险。
</Warning>

## <a id="install"></a> 安装

Zalo Personal 是一个官方外部插件，不包含在核心中。请先安装后再使用：

```bash
openclaw plugins install @openclaw/zalouser
```

- 固定版本：`openclaw plugins install @openclaw/zalouser@<version>`
- 从源代码检出安装：`openclaw plugins install ./path/to/local/zalouser-plugin`
- 详情：[插件](/tools/plugin)。

## <a id="quick-setup"></a> 快速设置

1. 安装插件（见上文）。
2. 登录（QR，在 Gateway 机器上）：
   - `openclaw channels login --channel zalouser`
   - 使用 Zalo 移动应用程序扫描 QR 代码。
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

4. 检查`openclaw channels status --probe`；如果网关离线，则启动网关。配置更改遵循 [hot reload](/gateway/configuration/hot-reload)。
5. DM 访问默认是 pairing；首次联系时请在配对码上批准。

## <a id="what-it-is"></a> 它是什么

- 完全通过 `zca-js` 库在进程内运行（不需要外部 `zca`/`openzca` 二进制文件）。
- 使用原生事件监听器（`message`、`error`）接收传入消息。
- 直接通过JS API （text/media/link）发送回复。
- 面向“个人账号”使用场景设计，在这些场景中无法使用 Zalo Bot API。

## <a id="naming"></a> 命名

Channel id 是 `zalouser`，以明确表示这会自动化一个**个人 Zalo 用户账号**（非官方）。`zalo` 保留给未来可能的官方 Zalo API 集成。

## <a id="finding-ids-(directory)"></a><a id="finding-ids-directory"></a> 查找 ID（目录）

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## <a id="limits"></a> 限制

- 出站文本按 2000 个字符分块（Zalo 客户端限制）。
- 取消或替换发送会在准备后停止其后续请求。已提交的消息可能仍会到达，并且当后面的块或音频步骤失败时，先前报告的消息 ID 仍会被记录。
- `channels.zalouser.mediaMaxMb` 限制 MiB 中的每个出站附件。所选通道帐户的 `mediaMaxMb` 覆盖根，然后 `agents.defaults.mediaMaxMb` 提供后备。图像可能会被优化；省略限制保留共享加载程序默认值。
- 不支持流式传输。
- 已完成的入站消息 ID 保留 30 天，仅限于每个帐户的 1000 个最新条目。

可选的 `zalouser` 工具选择凭证配置文件，而不是通道帐户。仅当该帐户使用所选配置文件时，其图像操作才使用当前递送帐户的上限。否则，它使用通道根和代理回退；它不会搜索碰巧共享该配置文件的其他帐户。轮廓选择和工具的文字 `default` 轮廓保持不变。

## <a id="inbound-durability"></a> 入站持久性

OpenClaw 会在处理每个原始 `zca-js` 消息回调之前先将其存储起来。待处理消息会在 Gateway 重启后从账户队列中恢复，并且对于每个私聊或群聊，处理过程都会保持串行化。

`zca-js` 套接字侦听器不会公开传送确认或在重新连接后自动重播旧消息。因此，持久队列会在回调到达 OpenClaw 后保护本地崩溃窗口；它无法恢复套接字从未传递的消息。重放逻辑删除主要是为了防止使用相同的 Zalo 消息 ID 重复回调。

## <a id="access-control-(dms)"></a><a id="access-control-dms"></a> 访问控制（私信）

`channels.zalouser.dmPolicy`：`pairing | allowlist | open | disabled`（默认：`pairing`）。

`channels.zalouser.allowFrom` 应使用稳定的 Zalo 用户 ID。它还可以引用静态发送者访问组 （`accessGroup:<name>`）。在交互式设置期间，可以使用插件的进程内联系人查找将输入的名称解析为 ID。

如果配置中保留原始名称，则仅当启用 `channels.zalouser.dangerouslyAllowNameMatching: true` 时启动才会解析它。如果没有该选择，运行时发件人检查将仅限于 ID-，并且授权时将忽略原始名称。

通过以下方式批准：

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## <a id="group-access-(optional)"></a><a id="group-access-optional"></a> 群组访问（可选）

- 默认：`channels.zalouser.groupPolicy = "allowlist"`（群组需要显式的 allowlist 条目）。
- 打开所有群组：`channels.zalouser.groupPolicy = "open"`。
- 屏蔽所有群组：`channels.zalouser.groupPolicy = "disabled"`。
- 当 `groupPolicy = "allowlist"` 时：
  - `channels.zalouser.groups` 密钥应该是稳定的组 ID；仅当启用 `channels.zalouser.dangerouslyAllowNameMatching: true` 时，名称才会在启动时解析为 ID。
  - `channels.zalouser.groupAllowFrom` 控制允许的群组中哪些发送者可以触发机器人；静态发送者访问组可通过 `accessGroup:<name>` 引用。
- 配置向导可以提示输入群组 allowlist。
- 默认情况下，Group 白名单匹配为 ID-only。除非启用 `channels.zalouser.dangerouslyAllowNameMatching: true`，否则身份验证将忽略未解析的名称。
- `channels.zalouser.dangerouslyAllowNameMatching: true` 是一种破窗兼容模式，会重新启用可变的启动时名称解析和运行时群组名匹配。
- `groupAllowFrom` 是否会 **not** 回退到 `allowFrom` 以处理普通组消息：在允许列表组上将其留空，会向任何发件人打开该组。授权控制命令（例如 `/new`）除外；当 `groupAllowFrom` 为空时，命令发送者检查回退到 `allowFrom`。

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

### <a id="group-mention-gating"></a> 群组提及门控

- `channels.zalouser.groups.<group>.requireMention` 控制群组回复是否需要提及。
- 解析顺序：组 id -> `group:<id>` 别名 -> 组 name/slug（基于名称的候选仅在 `dangerouslyAllowNameMatching: true` 时适用） -> `*` -> 默认 （`true`）。
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

## <a id="multi-account"></a> 多账户

该账户在 OpenClaw 状态中映射到 `zalouser` 配置文件。示例：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      groupPolicy: "allowlist",
      defaultAccount: "work",
      accounts: {
        work: { enabled: true, profile: "work", groupPolicy: "allowlist" },
      },
    },
  },
}
```

## <a id="environment-variables"></a> 环境变量

配置文件中的 profile 选择也可以来自环境变量：

| 变量                | 用途                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| `ZALOUSER_PROFILE` | 当 channel 或 account 配置中未设置 `profile` 时使用的 profile 名称。 |
| `ZCA_PROFILE`      | 旧版回退选项，仅在未设置 `ZALOUSER_PROFILE` 时使用。             |

配置文件名称选择在 OpenClaw 状态下保存的 Zalo 登录凭据。决议顺序：

1. 配置中的显式 `profile`。
2. `ZALOUSER_PROFILE`.
3. `ZCA_PROFILE`.
4. 非默认账号使用账号 id，默认账号使用 `default`。

对于多账号设置，建议在配置中为每个账号单独设置 `profile`，这样一个环境变量不会让多个账号共享同一个登录会话。

## <a id="typing%2C-reactions%2C-and-delivery-acknowledgements"></a><a id="typing-reactions-and-delivery-acknowledgements"></a> 打字、反应与送达确认

- OpenClaw 会在发送回复前先发送一个输入中事件（尽力而为）。
- 通道操作中的 `zalouser` 支持消息反应操作 `react`。
  - 使用 `remove: true` 可从消息中移除特定反应表情。
  - 反应语义：[反应](/tools/reactions)
- 对于包含事件元数据的入站消息，OpenClaw 会发送已送达 + 已查看确认（尽力而为）。

## <a id="troubleshooting"></a> 故障排查

**登录无法保持：**

- `openclaw channels status --probe`
- 重新登录：`openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**Allowlist/group 名称未解析：**

- 在 `allowFrom`/`groupAllowFrom` 中使用数字 ID，在 `groups` 中使用稳定组 ID。如果您有意需要准确的 friend/group 名称，请启用 `channels.zalouser.dangerouslyAllowNameMatching: true`。

**从旧的外部 `zca`/CLI-based 设置升级：**

- 移除任何对外部 `zca` 进程的假设；该通道现在通过 `zca-js` 完全在进程内运行，不再需要外部 CLI 二进制文件。

**DM 升级后历史记录丢失：**

- 运行 `openclaw doctor --fix` 以修复受支持的旧版 DM 会话密钥。 Doctor 检查每个配置的代理，包括指定代理，并保留真实的组会话。

## <a id="related"></a> 相关内容

- [Channels Overview](/channels) - 所有支持的渠道
- [Pairing](/channels/pairing) - DM 身份验证和配对流程
- [群组](/channels/groups) - 群聊行为和提及门控
- [通道路由](/channels/channel-routing) - 消息的会话路由
- [Security](/gateway/security) - 访问模型和强化
