---
summary: "将 OpenClaw 代理连接到 Buzz 房间"
read_when:
  - 你希望人们从 Buzz 访问 OpenClaw 代理
  - 你正在设置 Buzz 机器人身份和房间访问权限
  - 你正在排查 Buzz 连接问题
title: "Buzz"
---

Buzz 是一个官方频道插件，可将 OpenClaw 代理连接到托管或自托管的 Buzz 工作区中的团队房间。

## 它的作用

- 接收来自已批准 Buzz 房间的普通消息、富内容消息和结构化差异消息
- 在同一房间和线程中回复
- 在已接受的代理回合运行期间显示正在输入
- 保留回复中的 Markdown，并通过 OpenClaw 内置的
  `message` 工具发送文本
- 从回复和主动消息中向当前房间成员发送原生 Buzz 提及
- 支持提及要求和发送者允许列表
- 在机器人获得批准后发现房间
- 通过 OpenClaw 的目录命令解析当前 Buzz 个人资料名称、头像、房间名称和房间成员资格
- 重新连接，并避免重复处理同一条消息

当前插件支持群组房间、Markdown 文本和入站结构化差异。暂不支持私信、媒体和文件、原生回应、创建房间以及自动管理员批准。

## Buzz 身份和房间模型

Buzz 使用 Nostr 密钥对作为身份：

- **私钥**用于让 OpenClaw 进行身份验证并签署消息。它保留在 Gateway 中。
- **公钥**用于标识机器人。Buzz 所有者用它进行中继审批，房间管理员用它授予 **Bot** 角色，OpenClaw 也可以在发送者允许列表中使用公钥。

中继 URL 指向一个 Buzz 工作区。每个房间都有一个 UUID，OpenClaw 会将每个已配置的 UUID 视为一个单独的群组会话。一个 Gateway 和机器人身份可以服务多个房间；你不需要为每个代理或房间都配置一个 Gateway。

## 开始之前

你需要：

1. 你的 Buzz 工作区的 `wss://` 中继 URL。
2. 一位可以批准机器人身份的 Buzz 所有者或管理员。
3. 至少一个可以将机器人以 **Bot** 角色添加进去的房间。

<Warning>
切勿将人类 Buzz 所有者的私钥提供给 OpenClaw。OpenClaw 会创建或使用一个专用的机器人身份，并显示管理员审批所需的公钥。
</Warning>

## 安装

```bash
openclaw plugins install @openclaw/buzz
```

安装或更新插件后，请重启 Gateway。

## 指导性设置

运行：

```bash
openclaw channels add --channel buzz
```

设置流程将按以下步骤进行：

1. 如果尚未配置，则输入 Buzz 中继 URL。
2. OpenClaw 复用已配置的机器人身份，或自动生成一个。
3. 如果机器人尚未拥有房间访问权限，请将显示的公钥提供给
   Buzz 房间所有者或管理员。
4. OpenClaw 等待 Buzz 确认 **Bot** 角色并自动继续。
   如果自动等待超时，请重新尝试已认证的发现，或返回而不更改已生成的身份。
5. 如果 Buzz 只返回一个房间，OpenClaw 将选择它。如果 Buzz 返回多个房间，
   请选择要使用的房间以及默认的出站房间。
6. OpenClaw 保存配置，并在 Gateway 运行时静默验证已认证的
   房间。

全新设置会接受来自已配置房间当前成员的普通消息，而不要求 composer 提及。
当重新运行设置时，现有的显式提及和发送者允许名单设置会被保留。

自动房间访问等待是有时间上限的。如果未能在时间内授予访问权限，设置将保持打开状态，并提供已认证的重试/返回控制。每次重试都会复用相同的中继和机器人身份；该超时不会禁用 Buzz，也不会退出设置。

### 机器人批准

每个目标房间都必须包含带有 **Bot** 角色的机器人身份。现有的人类成员或普通房间成员角色都不够。

Buzz 桌面版无法可靠地为由外部管理的 OpenClaw 身份分配 Bot 角色。请作为现有的人类房间所有者或管理员使用 Buzz CLI：

```bash
buzz channels add-member \
  --channel <ROOM_UUID> \
  --pubkey <BOT_PUBLIC_KEY> \
  --role bot
```

请以现有的人类所有者或管理员身份运行该命令。绝不要把那个人类私钥交给 OpenClaw。

Gateway 连接后，OpenClaw 会保留现有的非空 Buzz 个人资料显示名称。对于新个人资料，它会先使用已配置的 Buzz channel 账户名，然后使用路由到已配置 Buzz 房间的单个 agent 的身份名称，最后使用 `OpenClaw`。这会在 Buzz 的个人资料缓存刷新后替换缩短的公钥。

OpenClaw 还会在 Buzz 的 agent 目录中注册相同的公共身份。它会保留现有的 agent 目录个人资料和 channel-add 策略；对于新个人资料，它会允许经授权的 Buzz 用户添加该身份。这样当该身份被邀请到其他房间时，Buzz 就能分配 **Bot** 角色，而不是将其视为普通成员。OpenClaw 仍然只会接收来自 `channels.buzz.groups` 中明确选定房间的消息。

当 bot 个人资料没有有效的 NIP-OA 所有者证明时，Buzz 会显示 `owner unavailable`。这并不意味着房间访问失败。配置了 `channels.buzz.authTag` 时，OpenClaw 会在发布的个人资料中包含该证明，以便 Buzz 显示已验证的人类所有者。

在 Gateway 连接期间，OpenClaw 每 30 秒发布并刷新一次 bot 的临时 Buzz 在线状态。当该 bot 身份的最后一个已认证 Gateway 连接关闭时，Buzz 会移除该在线状态，因此多个 Gateway 实例不会错误地将彼此标记为离线。

本地 Buzz `just dev` 中继默认不需要单独的中继成员资格。托管或封闭中继可能要求先将 bot 公钥添加到工作区社区。添加社区成员资格会授予中继访问权限；它不会将该身份以 Bot 角色添加到房间中。

```bash
buzz-admin add-member --pubkey <BOT_PUBLIC_KEY> --role member
```

OpenClaw 无法授予房间或中继访问权限。它只会显示授权人类所需的 bot 公钥。

## Agent 工具和消息传递

Buzz 插件不会添加一个单独的仅限 Buzz 的 agent 工具。它会将 Buzz 注册为 OpenClaw 内置 `message` 工具和正常回复投递的目标。

agents 可以：

- 在其房间或线程中回复收到的 Buzz 消息
- 在生成回复时显示房间级或线程级输入状态
- 接收 Buzz kind `9` 普通消息、kind `40002` 富内容消息以及 kind `40008` 结构化差异
- 将 Markdown 文本作为普通 kind `9` 消息发送到已批准的 Buzz 房间
- 在普通回复和主动消息中发送原生的房间成员提及
- 在工作流未指定目标时使用配置的默认房间
- 使用所路由 agent 的常规技能、记忆和允许使用的工具

当以下字段存在时，结构化差异会将其仓库、提交、文件、分支、拉取请求、语言、描述、截断状态和统一差异内容包含在 agent 上下文中。差异内容不会被解释为 OpenClaw 命令或文本提及。

输入状态使用活动的已认证 Gateway 连接上的 Buzz 临时 kind `20002`。普通回复每三秒刷新一次；由心跳驱动的回复使用 OpenClaw 的共享输入状态间隔，默认为六秒。当本轮处理完成、被取消、失败或 Gateway 关闭时，OpenClaw 会停止刷新。输入状态失败不会阻塞回复，也不会仅为发送临时事件而重新连接 Gateway。

人类和自动化流程可以通过 CLI 测试相同的出站路径：

```bash
openclaw message send \
  --channel buzz \
  --target buzz:<ROOM_UUID> \
  --message "Hello from OpenClaw"
```

### 原生提及

将当前房间中唯一成员的个人资料名称写成 `@Display Name`。OpenClaw 会保持可见文本不变，并添加原生 Buzz `p` 标签，线程回复也同样如此。名称只会根据目标房间当前由中继签名的成员列表和有界个人资料快照进行解析。

如需指定明确的身份，请在消息中包含其 NIP-27 引用：

```bash
openclaw message send \
  --channel buzz \
  --target engineering \
  --message "Please review this, nostr:npub1..."
```

被引用的公钥必须是目标房间的当前成员。如果未指定明确身份，未知名称和重复的个人资料名称会明确失败，而不会发送看似提及但实际上不会通知任何人的文本。当消息包含明确身份时，未解析或有歧义的标签会保留为展示文本；请明确包含每个预期身份。有歧义的错误会列出候选公钥，以便发送者使用预期的 `nostr:npub...` 身份重试。不属于房间的公钥始终会失败。行内或围栏 Markdown 代码中的类似提及文本会被忽略，并且一条消息最多可包含 50 个原生提及。

已连接的 Gateway 会从现有的内存目录快照中解析名称，不会针对每条消息查询中继。超出有界快照范围的个人资料需要明确的 `nostr:npub...` 身份。独立的提及发送会通过一次有界的已认证中继会话加载成员信息和个人资料、发布消息，然后关闭会话；不包含提及语法的独立消息会继续使用现有的直接发布路径。

### 目录和发送者标签

OpenClaw 会保留已配置房间、其当前由中继签名的成员列表、房间元数据以及 kind `0` 成员个人资料的有界快照。当可用时，传入的 agent 上下文会使用当前的个人资料名称和房间名称，而发送者公钥仍然是稳定的授权、路由和会话身份。

通过 CLI 检查相同的数据：

```bash
openclaw directory self --channel buzz
openclaw directory peers list --channel buzz --query "alice"
openclaw directory groups list --channel buzz --query "engineering"
openclaw directory groups members \
  --channel buzz \
  --group-id buzz:<ROOM_UUID>
```

当 Gateway 已连接时，目录读取会复用其已认证的 Buzz 连接和内存快照。独立的目录命令会打开一个有界的已认证连接，加载当前快照，然后将其关闭。普通目录错误会被记录，但不会触发重新连接。如果目录或个人资料订阅未能在 10 秒内达到 EOSE，OpenClaw 会将 Buzz 中继会话视为停滞，并仅回收该 Buzz 账户的连接；Gateway 会继续运行。

已归档的房间会从目录结果和实时房间订阅中排除。如果 OpenClaw 连接期间某个已配置房间被归档或恢复，插件只会回收其 Buzz 连接，使订阅集合与中继的当前元数据保持一致。Gateway 会继续运行。

每个已配置房间使用一个房间范围的中继订阅。OpenClaw 为成员通知以及并发的个人资料、成员信息和元数据查询保留 Buzz 1,024 个连接订阅中的四个，因此一个账户最多可以配置 1,020 个房间。接近该上限时，会优先减少可选的成员个人资料订阅；目录条目仍可通过稳定的公钥和确定性的备用标签正常工作。

当前房间中唯一的名称可以通过 OpenClaw 的共享目录查找解析为出站目标。规范的 `buzz:<ROOM_UUID>` 目标仍然是自动化场景以及名称重复房间的最安全选择。

### 将房间路由到不同的 agent

标准 OpenClaw 绑定可以将每个 Buzz 房间发送给不同的 agent、workspace 或 model，而一个 Gateway 和 Buzz bot 为它们全部提供服务：

```json5
{
  agents: {
    entries: {
      support: { default: true, workspace: "~/.openclaw/workspace-support" },
      engineering: { workspace: "~/.openclaw/workspace-engineering" },
    },
  },
  bindings: [
    {
      agentId: "support",
      match: {
        channel: "buzz",
        peer: { kind: "group", id: "buzz:<SUPPORT_ROOM_UUID>" },
      },
    },
    {
      agentId: "engineering",
      match: {
        channel: "buzz",
        peer: { kind: "group", id: "buzz:<ENGINEERING_ROOM_UUID>" },
      },
    },
  ],
}
```

如果没有特定于房间的绑定，正常的 OpenClaw 路由会选择默认 agent。有关匹配优先级，请参见 [渠道路由](/channels/channel-routing)。

## 访问控制

Buzz 采用两种独立的控制：

- **要求提及**：仅当机器人被提及（@）时，代理才会响应。
- **发送者访问权限**：允许经过批准房间中的所有当前成员，禁用
  房间进入，或者进一步将房间成员限制为选定的 Buzz 公钥。

全新的引导式设置允许选定房间中的当前成员发送普通消息。OpenClaw 在接受消息之前会加载 Buzz 的中继签名房间名册，在持久化去重或代理工作之前先在内存中检查成员资格，并在 Buzz 成员变更事件后刷新名册。没有逐条消息的中继查询或 Gateway 轮询。

在手动配置中，当只有特定房间成员应能够激活代理时，请使用带有 `groupAllowFrom` 的 `groupPolicy: "allowlist"`。
仅当这些成员所使用的 Buzz 客户端可以指向机器人身份时，才设置 `requireMention: true`。

这些控制决定了谁可以启动一次代理运行；它们不会限制路由后的代理在消息被接受后可以做什么。请将房间消息视为不受信任的输入，并根据房间的信任级别为该代理配置[沙箱和工具策略](/gateway/sandbox-vs-tool-policy-vs-elevated)。

## 手动配置

建议使用引导式设置。等效配置如下：

```json5
{
  channels: {
    buzz: {
      name: "OpenClaw",
      relayUrl: "wss://buzz.example.com",
      privateKey: "nsec1...",
      groupPolicy: "open",
      groups: {
        "7c4a6d2a-2ed9-4b4e-a5e2-4d705ee9b34c": {
          requireMention: false,
        },
      },
      defaultTo: "7c4a6d2a-2ed9-4b4e-a5e2-4d705ee9b34c",
    },
  },
}
```

对于更严格的发送者策略：

```json5
{
  channels: {
    buzz: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["<64_CHARACTER_HEX_SENDER_PUBLIC_KEY>"],
    },
  },
}
```

房间 UUID 是规范目标。请使用发现过程中显示的 UUID，或向房间管理员索要该 UUID。唯一的当前房间名称可以通过实时目录解析，但自动化应使用 `buzz:<ROOM_UUID>` 以避免歧义。

对于手动配置，`groupAllowFrom` 条目必须使用 64 个字符的十六进制格式。

### Bot 密钥存储

默认的引导式路径会复用当前 bot 身份，或生成一个私钥并将其存储在 `channels.buzz.privateKey` 中，遵循 OpenClaw 当前的明文配置约定。

对于现有密钥，设置可以使用明文或现有的 `env`、`file` 或 `exec` SecretRef。有关提供方设置，请参见 [密钥管理](/gateway/secrets)。默认账户也可以读取：

```bash
export BUZZ_RELAY_URL="wss://buzz.example.com"
export BUZZ_PRIVATE_KEY="nsec1..."
```

如果托管工作区运营方提供给你一个身份授权值，请设置 `channels.buzz.authTag` 或 `BUZZ_AUTH_TAG`。它可以使用与私钥相同的明文或 SecretRef 形式。请将这个委托的、可重复使用的值视为机密：不要将其放在日志、截图、聊天和源代码管理中，并且对于持久化部署，优先使用 SecretRef。每当 bot 身份或中继授权发生变化，或者任一凭据可能已泄露时，都应请求替换并撤销旧值。

自托管运营方可以手动生成密钥用于恢复或高级设置：

```bash
buzz-admin generate-key
```

## 验证连接

运行已认证的通道探测：

```bash
openclaw channels status --channel buzz --probe
```

探测成功表明机器人可以完成身份验证，并且 Buzz 会以 **Bot** 角色报告所选房间。

然后发送一条真实消息：

```bash
openclaw message send \
  --channel buzz \
  --target buzz:<ROOM_UUID> \
  --message "OpenClaw Buzz test"
```

要完成一次完整的往返测试，请让一个被允许的 Buzz 用户提及机器人，并确认 OpenClaw 会在房间中回复。

### QA 实验室往返测试

源代码检出可以使用两个专用测试身份来测试生产环境的 Buzz 通道路径：

```bash
pnpm openclaw qa buzz \
  --credential-file /secure/path/buzz-qa-credentials.json \
  --provider-mode mock-openai
```

该命令使用确定性的模拟模型，运行真实的中继金丝雀测试和提及门控检查。私有 JSON 凭据文件包含 `relayUrl`、`roomId`、`driverPrivateKey` 和 `sutPrivateKey`，以及用于封闭中继的可选 `driverAuthTag` 和 `sutAuthTag` 值。两个测试公钥都必须是房间成员，并且 SUT 公钥必须具有 **Bot** 角色。封闭中继可能要求分别注册这两个公钥。使用 `--credential-source convex` 获取池化的 QA 凭据。

托管中继使用 `wss://`。明文 `ws://` 凭据 URL 仅接受用于回环开发中继。

切勿使用人类所有者或管理员的私钥。私钥和可选的授权值属于父级测试框架的机密信息，不得出现在日志、构建产物、屏幕截图、Shell 历史记录或源代码管理中。

## 轮换机器人身份

机器人身份轮换需要管理员批准新的公钥：

1. 生成一个新的专用机器人身份。
2. 让管理员为中继和每个已配置的房间批准其公钥。
3. 替换已配置的私钥并重启或重新加载 Gateway。
4. 测试出站和入站消息。
5. 从房间和中继中移除旧公钥。

在切换密钥之前完成批准，以尽量减少停机时间。轮换目前不是自动的。

## 当前限制和路线图

以下后续功能已列入计划，但不属于当前插件的一部分：

- 直接消息
- 媒体和文件上传或下载
- 原生表情回应
- 从 OpenClaw 创建或管理房间
- 自动中继成员资格和房间角色审批
- 引导式机器人身份轮换。

## 故障排查

| 症状                                         | 需要检查的内容                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 未发现任何房间                               | 确认这个确切的 bot 公钥已在房间中并具有 **Bot** 角色，然后重新运行相同的设置命令。                               |
| 身份验证失败                                 | 检查 relay URL、bot 私钥、关闭的 relay 成员资格，以及操作员提供的任何授权值。                                   |
| 无法发送消息                                 | 确认 bot 是房间成员并具有 **Bot** 角色，并且 UUID 已配置。                                                       |
| bot 收到消息但不回复                          | 确认发送者仍然是房间成员，然后检查可选的发送者允许列表和提及要求。                                                 |
| 设置提示 Gateway 未运行                       | 使用 `openclaw gateway` 启动它，然后运行 `openclaw channels status --probe`。                                     |
| 自动房间发现过期                               | 授予 Bot 角色，然后选择重试；相同的身份将保持激活。                                                                |

## 相关内容

- [频道概览](/channels)
- [频道访问控制](/channels/groups)
- [密钥管理](/gateway/secrets)
- [频道故障排除](/channels/troubleshooting)
