---
summary: "通过原生 zca-js 支持的 Zalo 个人账户（二维码登录）、功能和配置"
read_when:
  - 为 OpenClaw 设置 Zalo Personal
  - 调试 Zalo Personal 登录或消息流
title: "Zalo personal"
---

状态：实验性。此集成通过 OpenClaw 内部原生的 `zca-js` 自动化一个**个人 Zalo 账户**。

> **警告：** 这是非官方集成，可能会导致账户被暂停或封禁。风险自负。

## 内置插件

Zalo Personal 作为内置插件包含在当前的 OpenClaw 发布版中，因此正常的打包构建无需单独安装。

如果您使用的是较旧的构建版本或排除了 Zalo Personal 的自定义安装，请手动安装：

- 通过 CLI 安装：`openclaw plugins install @openclaw/zalouser`
- 或从源代码检出：`openclaw plugins install ./path/to/local/zalouser-plugin`
- 详情：[插件](/tools/plugin)

无需外部的 `zca` 或 `openzca` CLI 可执行文件。

## 快速入门（初学者）

1. 确保 Zalo Personal 插件可用。
   - 当前打包的 OpenClaw 发布版已包含它。
   - 较旧/自定义安装可以通过上述命令手动添加。
2. 登录（二维码，在网关机器上）：
   - `openclaw channels login --channel zalouser`
   - 使用 Zalo 手机应用扫描二维码。
3. 启用频道：

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

4. 重启网关（或完成设置）。
5. 私信访问默认为配对；首次联系时需批准配对码。

## 这是什么

- 完全在进程内通过 `zca-js` 运行。
- 使用原生事件监听器接收入站消息。
- 通过 JS API 直接发送回复（文本/媒体/链接）。
- 设计用于 Zalo Bot API 不可用时的“个人账户”使用场景。

## 命名说明

频道 ID 为 `zalouser`，以明确标识这是自动化操作的 **个人 Zalo 用户账户**（非官方）。`zalo` 保留为未来潜在官方 Zalo API 集成使用。

## 查找 ID（通讯录）

使用通讯录 CLI 来发现好友/群组及其 ID：

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## 限制

- 出站文本分块至约 2000 字符（Zalo 客户端限制）。
- 默认阻止流式传输。

## 访问控制（私信）

`channels.zalouser.dmPolicy` 支持：`pairing | allowlist | open | disabled`（默认：`pairing`）。

`channels.zalouser.allowFrom` 支持用户 ID 或名称。在设置期间，名称会通过插件内置的联系人查找解析为 ID。

通过如下命令批准访问：

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## 群组访问（可选）

- 默认：`channels.zalouser.groupPolicy = "open"`（允许群组）。未设置时可通过 `channels.defaults.groupPolicy` 覆盖默认值。
- 通过以下方式限制为允许列表：
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups`（键应为稳定的群组 ID；启动时会尽可能将名称解析为 ID）
  - `channels.zalouser.groupAllowFrom`（控制允许群组内哪些发送者可以触发机器人）
- 屏蔽所有群组：`channels.zalouser.groupPolicy = "disabled"`。
- 配置向导可提示设置群组允许列表。
- 启动时，OpenClaw 会解析允许列表中的群组/用户名为 ID 并记录映射。
- 群组允许列表匹配默认仅限 ID；未解析的名称会被忽略认证，除非启用 `channels.zalouser.dangerouslyAllowNameMatching: true`。
- `channels.zalouser.dangerouslyAllowNameMatching: true` 是一种紧急兼容模式，重新启用可变群组名匹配。
- 若未设置 `groupAllowFrom`，运行时群组发送者检查回退到 `allowFrom`。
- 发送者检查适用于普通群组消息和控制命令（例如 `/new`、`/reset`）。

示例：

```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["1471383327500481391"],
      groups: {
        "123456789": { allow: true },
        "Work Chat": { allow: true },
      },
    },
  },
}
```

### 群组提及门控

- `channels.zalouser.groups.<group>.requireMention` 控制群组回复是否需要提及。
- 解析顺序：精确群组 ID/名称 -> 规范化群组别名 -> `*` -> 默认（`true`）。
- 这既适用于允许列表中的群组，也适用于开放群组模式。
- 引用机器人消息视为群组激活的隐式提及。
- 授权控制命令（例如 `/new`）可以绕过提及门控。
- 当群组消息因需要提及而被跳过时，OpenClaw 会将其存储为待处理群组历史记录，并在下一条处理的群组消息中包含它。
- 群组历史记录限制默认为 `messages.groupChat.historyLimit`（后备 `50`）。您可以使用 `channels.zalouser.historyLimit` 为每个账户覆盖此设置。

示例：

```json5
{
  channels: {
    zalouser: {
      groupPolicy: "allowlist",
      groups: {
        "*": { allow: true, requireMention: true },
        "Work Chat": { allow: true, requireMention: false },
      },
    },
  },
}
```

## 多账户

账户映射到 OpenClaw 状态中的 `zalouser` 配置文件。例如：

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

## 输入状态、表情反应和送达确认

- OpenClaw 在发送回复前会发送输入中事件（尽力而为）。
- `zalouser` 支持消息反应动作 `react`。
  - 使用 `remove: true` 从消息中移除特定表情。
  - 反应语义详见：[反应](/tools/reactions)
- 对于带事件元数据的入站消息，OpenClaw 会发送送达和已读确认（尽力而为）。

## 故障排除

**登录不持久：**

- 执行 `openclaw channels status --probe`
- 重新登录：`openclaw channels logout --channel zalouser && openclaw channels login --channel zalouser`

**允许列表/群组名称未解析：**

- 在 `allowFrom`/`groupAllowFrom`/`groups` 中使用数字 ID，或精确好友/群组名称。

**从旧版基于 CLI 的设置升级：**

- 移除任何旧的外部 `zca` 进程假设。
- 该频道现在完全在 OpenClaw 内部运行，无需外部 CLI 二进制文件。

## 相关内容

- [频道概览](/channels) — 所有支持的频道
- [配对](/channels/pairing) — 私消息认证和配对流程
- [群组](/channels/groups) — 群聊行为和提及门控
- [频道路由](/channels/channel-routing) — 消息的会话路由
- [安全](/gateway/security) — 访问模型和加固
