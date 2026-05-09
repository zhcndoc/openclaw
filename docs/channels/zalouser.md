---
summary: "通过原生 zca-js（二维码登录）支持 Zalo 个人账号、能力与配置"
read_when:
  - 为 OpenClaw 设置 Zalo Personal
  - 调试 Zalo Personal 登录或消息流
title: "Zalo 个人版"
---

状态：实验性。此集成通过 OpenClaw 内部的原生 `zca-js` 自动化一个 **个人 Zalo 账号**。

<Warning>
这是一个非官方集成，可能导致账号被暂停或封禁。请自行承担风险。
</Warning>

## 捆绑插件

Zalo Personal 作为当前 OpenClaw 版本中的捆绑插件提供，因此正常的
打包构建无需单独安装。

如果你使用的是较旧的版本，或是一个排除了 Zalo Personal 的自定义安装，
请直接安装 npm 包：

- 通过 CLI 安装：`openclaw plugins install @openclaw/zalouser`
- 锁定版本：`openclaw plugins install @openclaw/zalouser@2026.5.2`
- 或者从源码检出安装：`openclaw plugins install ./path/to/local/zalouser-plugin`
- 详情：[插件](/tools/plugin)

不需要任何外部 `zca`/`openzca` CLI 二进制文件。

## 快速设置（初学者）

1. 确保 Zalo Personal 插件可用。
   - 当前打包版 OpenClaw 发行版已包含该插件。
   - 较旧/自定义安装可使用上面的命令手动添加。
2. 登录（二维码，在 Gateway 机器上）：
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
5. DM 访问默认为 pairing；首次联系时请在配对码上批准。

## 它是什么

- 完全通过 `zca-js` 在进程内运行。
- 使用原生事件监听器接收入站消息。
- 直接通过 JS API 发送回复（文本/媒体/链接）。
- 专为 Zalo Bot API 不可用的“个人账号”场景而设计。

## 命名

通道 id 使用 `zalouser`，以明确表示这是在自动化一个 **个人 Zalo 用户账号**（非官方）。我们保留 `zalo`，以便未来可能接入官方 Zalo API 集成。

## 查找 ID（目录）

使用目录 CLI 来发现好友/群组及其 ID：

```bash
openclaw directory self --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory groups list --channel zalouser --query "work"
```

## 限制

- 出站文本会被分块到约 2000 个字符（Zalo 客户端限制）。
- 默认阻止流式传输。

## 访问控制（私信）

`channels.zalouser.dmPolicy` 支持：`pairing | allowlist | open | disabled`（默认：`pairing`）。

`channels.zalouser.allowFrom` 应使用稳定的 Zalo 用户 ID。在交互式设置期间，输入的名称可通过插件的进程内联系人查找解析为 ID。

如果原始名称仍保留在配置中，仅当启用 `channels.zalouser.dangerouslyAllowNameMatching: true` 时，启动才会解析它。若不启用该选项，运行时发送者检查仅基于 ID，原始名称会被忽略，不用于授权。

通过以下方式批准：

- `openclaw pairing list zalouser`
- `openclaw pairing approve zalouser <code>`

## 群组访问（可选）

- 默认：`channels.zalouser.groupPolicy = "open"`（允许群组）。当未设置时，可使用 `channels.defaults.groupPolicy` 覆盖默认值。
- 通过以下方式限制为允许列表：
  - `channels.zalouser.groupPolicy = "allowlist"`
  - `channels.zalouser.groups`（键应为稳定的群组 ID；仅当启用 `channels.zalouser.dangerouslyAllowNameMatching: true` 时，名称才会在启动时解析为 ID）
  - `channels.zalouser.groupAllowFrom`（控制允许群组中哪些发送者可以触发机器人）
- 阻止所有群组：`channels.zalouser.groupPolicy = "disabled"`。
- 配置向导可提示输入群组允许列表。
- 启动时，仅当启用 `channels.zalouser.dangerouslyAllowNameMatching: true` 时，OpenClaw 才会将允许列表中的群组/用户名称解析为 ID 并记录映射。
- 默认情况下，群组允许列表匹配仅基于 ID。除非启用 `channels.zalouser.dangerouslyAllowNameMatching: true`，否则无法解析的名称会被忽略，不用于授权。
- `channels.zalouser.dangerouslyAllowNameMatching: true` 是一种“打破玻璃”式的兼容模式，会重新启用可变的启动名称解析和运行时群组名称匹配。
- 如果未设置 `groupAllowFrom`，运行时会回退使用 `allowFrom` 进行群组发送者检查。
- 发送者检查同时适用于普通群组消息和控制命令（例如 `/new`、`/reset`）。

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
- 解析顺序：精确群组 id/name -> 规范化后的群组 slug -> `*` -> 默认值（`true`）。
- 这同时适用于允许列表群组和开放群组模式。
- 引用机器人消息会被视为群组激活的隐式提及。
- 经授权的控制命令（例如 `/new`）可以绕过提及门控。
- 当群组消息因需要提及而被跳过时，OpenClaw 会将其作为待处理群组历史保存，并在下一条被处理的群组消息中包含它。
- 群组历史限制默认使用 `messages.groupChat.historyLimit`（回退为 `50`）。你可以通过 `channels.zalouser.historyLimit` 按账号覆盖。

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

## 多账号

账号映射到 OpenClaw 状态中的 `zalouser` 配置文件。示例：

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

## 输入中显示、反应和送达确认

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

**从旧的基于 CLI 的设置升级：**

- 移除任何旧的外部 `zca` 进程假设。
- 该通道现在完全在 OpenClaw 内运行，不需要外部 CLI 二进制文件。

## 相关内容

- [通道概览](/channels) — 所有受支持的通道
- [配对](/channels/pairing) — DM 身份验证和配对流程
- [群组](/channels/groups) — 群聊行为和提及门控
- [通道路由](/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型与加固
