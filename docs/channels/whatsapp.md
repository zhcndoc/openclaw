---
summary: "WhatsApp 渠道支持、访问控制、投递行为和操作"
read_when:
  - 处理 WhatsApp/web 渠道行为或收件箱路由时
title: "WhatsApp"
---

状态：通过 WhatsApp Web（Baileys）生产就绪。网关拥有已关联的会话。

## 安装（按需）

- 初始化引导（`openclaw onboard`）和 `openclaw channels add --channel whatsapp`
  会在您第一次选择它时提示安装 WhatsApp 插件。
- `openclaw channels login --channel whatsapp` 也会在插件尚不存在时提供安装流程。
- 开发渠道 + git checkout：默认为本地插件路径。
- 稳定版/测试版：默认为 npm 包 `@openclaw/whatsapp`。

手动安装仍然可用：

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/channels/pairing">
    默认的私信策略是对未知发送者进行配对。
  </Card>
  <Card title="渠道故障排查" icon="wrench" href="/channels/troubleshooting">
    跨渠道诊断和修复操作手册。
  </Card>
  <Card title="网关配置" icon="settings" href="/gateway/configuration">
    完整的渠道配置模式和示例。
  </Card>
</CardGroup>

## 快速设置

<Steps>
  <Step title="配置 WhatsApp 访问策略">

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+15551234567"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

  </Step>

  <Step title="关联 WhatsApp（二维码）">

```bash
openclaw channels login --channel whatsapp
```

    针对特定账户：

```bash
openclaw channels login --channel whatsapp --account work
```

    在登录前附加现有/自定义的 WhatsApp Web 认证目录：

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="启动网关">

```bash
openclaw gateway
```

  </Step>

  <Step title="批准首次配对请求（如果使用配对模式）">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    配对请求在 1 小时后过期。每个渠道最多同时待处理请求为 3 个。

  </Step>
</Steps>

<Note>
OpenClaw 建议尽可能使用独立号码运行 WhatsApp。（渠道元数据和设置流程针对该配置进行了优化，但也支持个人号码设置。）
</Note>

## 部署模式

<AccordionGroup>
  <Accordion title="专用号码（推荐）">
    这是最清晰的运营模式：

    - 为 OpenClaw 提供独立的 WhatsApp 身份
    - 更清晰的私信允许列表和路由边界
    - 降低自聊混淆的可能性

    最简政策模式：

    ```json5
    {
      channels: {
        whatsapp: {
          dmPolicy: "allowlist",
          allowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="个人号码应急方案">
    引导支持个人号码模式，并写入适合自聊的基线：

    - `dmPolicy: "allowlist"`
    - `allowFrom` 包含您的个人号码
    - `selfChatMode: true`

    运行时，自聊保护基于关联的自号码和 `allowFrom`。

  </Accordion>

  <Accordion title="仅限 WhatsApp Web 渠道范围">
    当前 OpenClaw 渠道架构中，消息平台渠道基于 WhatsApp Web（`Baileys`）。

    内置聊天渠道注册表中没有独立的 Twilio WhatsApp 消息渠道。

  </Accordion>
</AccordionGroup>

## 运行时模型

- 网关拥有 WhatsApp socket 和重连循环。
- 出站发送需要目标账户有一个活跃的 WhatsApp 监听器。
- 状态和广播聊天被忽略（`@status`, `@broadcast`）。
- 直接聊天使用 DM 会话规则（`session.dmScope`；默认 `main` 将 DM 折叠到代理主会话）。
- 群组会话是隔离的（`agent:<agentId>:whatsapp:group:<jid>`）。
- WhatsApp Web 传输遵循网关主机上的标准代理环境变量（`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / 小写变体）。优先使用主机级代理配置而不是渠道特定的 WhatsApp 代理设置。

## 插件钩子和隐私

WhatsApp 入站消息可能包含个人消息内容、电话号码、
群组标识符、发送者姓名和会话关联字段。因此，
除非您明确选择启用，否则 WhatsApp 不会将入站 `message_received` 钩子载荷广播给插件：

```json5
{
  channels: {
    whatsapp: {
      pluginHooks: {
        messageReceived: true,
      },
    },
  },
}
```

您可以将此选择启用范围限定为一个账户：

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        work: {
          pluginHooks: {
            messageReceived: true,
          },
        },
      },
    },
  },
}
```

仅对您信任能接收入站 WhatsApp 消息内容和标识符的插件启用此项。

## 访问控制和激活

<Tabs>
  <Tab title="私信策略">
    `channels.whatsapp.dmPolicy` 控制直接聊天访问：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    `allowFrom` 接受符合 E.164 格式的号码（内部标准化处理）。

    多账户覆盖：`channels.whatsapp.accounts.<id>.dmPolicy`（及 `allowFrom`）优先于该账户的渠道级默认值。

    运行时行为详情：

    - pairings are persisted in channel allow-store and merged with configured `allowFrom`
    - if no allowlist is configured, the linked self number is allowed by default
    - OpenClaw never auto-pairs outbound `fromMe` DMs (messages you send to yourself from the linked device)

  </Tab>

  <Tab title="群组策略与允许列表">
    群组访问分两个层级：

    1. **群组成员允许列表**（`channels.whatsapp.groups`）
       - 如果省略 `groups`，则所有群组均有资格
       - 如果存在 `groups`，则作为群组允许列表（允许 `"*"`）

    2. **群组发送者策略**（`channels.whatsapp.groupPolicy` + `groupAllowFrom`）
       - `open`：绕过发送者允许列表
       - `allowlist`：发送者必须匹配 `groupAllowFrom`（或 `*`）
       - `disabled`：阻止所有群组入站消息

    发送者允许列表后备：

    - 如果未设置 `groupAllowFrom`，运行时会回退为可用时的 `allowFrom`
    - 发送者允许列表在提及/回复激活前进行评估

    注意：如果根本不存在 `channels.whatsapp` 块，运行时群组策略后备为 `allowlist`（并打警告日志），即使设置了 `channels.defaults.groupPolicy`。

  </Tab>

  <Tab title="提及与 /activation">
    群组回复默认要求提及。

    提及检测包括：

    - 明确提及机器人身份的 WhatsApp 提及
    - 配置的提及正则表达式（`agents.list[].groupChat.mentionPatterns`，后备 `messages.groupChat.mentionPatterns`）
    - 隐式回复机器人检测（回复发送者匹配机器人身份）

    安全提示：

    - 引用/回复仅满足提及门槛；**不** 授予发送者授权
    - 使用 `groupPolicy: "allowlist"` 时，非允许列表内的发送者即使回复了允许用户的消息也会被屏蔽

    会话级激活命令：

    - `/activation mention`
    - `/activation always`

    `activation` 更新会话状态（非全局配置）。此操作需有所有者权限。

  </Tab>
</Tabs>

## 个人号码及自聊行为

当关联的自号码同时存在于 `allowFrom` 时，会启用 WhatsApp 自聊保护措施：

- 自聊轮次跳过已读回执
- 忽略会触发自己提醒的提及 JID 自动触发行为
- 如果未设置 `messages.responsePrefix`，自聊回复默认为 `[{identity.name}]` 或 `[openclaw]`

## 消息规范化与上下文

<AccordionGroup>
  <Accordion title="入站信封与回复上下文">
    收到的 WhatsApp 消息被包装在共享的入站信封中。

    如果存在引用回复，附加上下文形式为：

    ```text
    [回复给 <sender> id:<stanzaId>]
    <引用正文或媒体占位符>
    [/回复结束]
    ```

    支持填充回复元数据字段（`ReplyToId`、`ReplyToBody`、`ReplyToSender`、发送者 JID/E.164）当可用时。

  </Accordion>

  <Accordion title="媒体占位符与位置/联系人提取">
    仅媒体入站消息规范为占位符，如：

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    位置正文使用简洁的坐标文本。位置标签/备注以及联系人/vCard 详细信息会以带围栏的未受信任元数据呈现，而不是内联提示文本。

  </Accordion>

  <Accordion title="待处理群组历史注入">
    对于群组，未处理的消息可缓冲并在机器人最终被触发时注入为上下文。

    - 默认限制：`50`
    - 配置：`channels.whatsapp.historyLimit`
    - 后备：`messages.groupChat.historyLimit`
    - 设置为 `0` 禁用

    注入标记：

    - `[从您上次回复以来的聊天消息 - 用于上下文]`
    - `[当前消息 - 回复此内容]`

  </Accordion>

  <Accordion title="已读回执">
    默认为接受的入站 WhatsApp 消息启用已读回执。

    全局禁用：

    ```json5
    {
      channels: {
        whatsapp: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    按账户覆盖：

    ```json5
    {
      channels: {
        whatsapp: {
          accounts: {
            work: {
              sendReadReceipts: false,
            },
          },
        },
      },
    }
    ```

    自聊轮次即使全局启用也跳过已读回执。

  </Accordion>
</AccordionGroup>

## 投递、分块和媒体

<AccordionGroup>
  <Accordion title="文本分块">
    - 默认分块限制：`channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - `newline` 模式优先段落边界（空行），然后回退为长度安全分块
  </Accordion>

  <Accordion title="出站媒体行为">
    - 支持图片、视频、音频（PTT 语音便签）和文档负载
    - `audio/ogg` 会重写为 `audio/ogg; codecs=opus` 以兼容语音便签
    - 支持通过在视频发送时设置 `gifPlayback: true` 播放动画 GIF
    - 多媒体回复负载时，字幕应用于第一个媒体项
    - 媒体来源可为 HTTP(S)、`file://` 或本地路径
  </Accordion>

  <Accordion title="媒体大小限制和回退行为">
    - 入站媒体保存上限：`channels.whatsapp.mediaMaxMb`（默认 `50`）
    - 出站自动回复媒体上限：`agents.defaults.mediaMaxMb`（默认 `5MB`）
    - 图像会自动优化（调整大小/质量）以适应限制
    - 媒体发送失败时，首项回退发送文字警告，而非静默丢弃响应
  </Accordion>
</AccordionGroup>

## 回复引用

WhatsApp 支持原生回复引用，出站回复会明显引用入站消息。使用 `channels.whatsapp.replyToMode` 进行控制。

| 值 | 行为 |
| ----------- | --------------------------------------------------------------------- |
| `"off"`     | 从不引用；作为普通消息发送                                  |
| `"first"`   | 仅引用第一个出站回复分块                             |
| `"all"`     | 每个出站回复分块都引用                                      |
| `"batched"` | 引用队列中的批量回复，同时保持即时回复不引用 |

默认值为 `"off"`。按账户覆盖使用 `channels.whatsapp.accounts.<id>.replyToMode`。

```json5
{
  channels: {
    whatsapp: {
      replyToMode: "first",
    },
  },
}
```

## 反应级别

`channels.whatsapp.reactionLevel` 控制代理在 WhatsApp 上使用表情反应的广泛程度：

| 级别 | 确认反应 | 代理发起的反应 | 描述 |
| ------------- | ------------- | ------------------------- | ------------------------------------------------ |
| `"off"` | 否 | 否 | 完全无反应 |
| `"ack"` | 是 | 否 | 仅确认反应（回复前回执） |
| `"minimal"` | 是 | 是（保守） | 确认 + 代理反应，带有保守指导 |
| `"extensive"` | 是 | 是（鼓励） | 确认 + 代理反应，带有鼓励指导 |

默认值：`"minimal"`。

每个账户的覆盖使用 `channels.whatsapp.accounts.<id>.reactionLevel`。

```json5
{
  channels: {
    whatsapp: {
      reactionLevel: "ack",
    },
  },
}
```

## 确认反应

WhatsApp 支持通过 `channels.whatsapp.ackReaction` 对入站回执进行立即确认反应。
确认反应受 `reactionLevel` 控制 — 当 `reactionLevel` 为 `"off"` 时被抑制。

```json5
{
  channels: {
    whatsapp: {
      ackReaction: {
        emoji: "👀",
        direct: true,
        group: "mentions", // 可选值：always | mentions | never
      },
    },
  },
}
```

行为说明：

- 在入站消息接受后立即发送（回复前）
- 失败时记录日志，但不阻止正常回复发送
- 群组模式 `mentions` 在提及触发时反应；群组激活 `always` 作为该检查的绕过
- WhatsApp 使用 `channels.whatsapp.ackReaction`（这里不使用旧版的 `messages.ackReaction`）

## 多账户与凭证

<AccordionGroup>
  <Accordion title="账户选择和默认值">
    - 账户 ID 来源于 `channels.whatsapp.accounts`
    - 默认账户选择：如果存在 `default`，选择该账户，否则选择第一个配置的账户 ID（排序）
    - 账户 ID 内部标准化以便查找
  </Accordion>

  <Accordion title="凭证路径与兼容性">
    - 当前认证路径：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - 备份文件：`creds.json.bak`
    - 旧版默认认证路径 `~/.openclaw/credentials/` 仍被识别/迁移以支持默认账户流程
  </Accordion>

  <Accordion title="注销行为">
    运行 `openclaw channels logout --channel whatsapp [--account <id>]` 清除该账户的 WhatsApp 认证状态。

    旧版认证目录中 `oauth.json` 会被保留，Baileys 认证文件被删除。

  </Accordion>
</AccordionGroup>

## 工具、动作和配置写入

- 代理工具支持 WhatsApp 回复动作（`react`）。
- 动作门控：
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- 渠道发起的配置写入默认启用（通过设置 `channels.whatsapp.configWrites=false` 可禁用）。

## 故障排查

<AccordionGroup>
  <Accordion title="未关联（需要二维码）">
    症状：渠道状态报告未关联。

    解决：

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="已关联但断开连接 / 重连循环">
    症状：已关联账户反复断开或尝试重连。

    解决：

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    如有需要，使用 `channels login` 重新关联。

  </Accordion>

  <Accordion title="发送时无活动监听器">
    出站发送在目标账户无活动网关监听时快速失败。

    确认网关已运行且账户已关联。

  </Accordion>

  <Accordion title="群组消息意外被忽略">
    请按此顺序检查：

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - `groups` 允许列表条目
    - 提及门控（`requireMention` + 提及模式）
    - `openclaw.json` 中重复键（JSON5）：后面条目覆盖前面，确保每个作用域中只有一个 `groupPolicy`

  </Accordion>

  <Accordion title="Bun 运行时警告">
    WhatsApp 网关运行时应使用 Node。Bun 被标记为不兼容，不能稳定运行 WhatsApp/Telegram 网关。
  </Accordion>
</AccordionGroup>

## 系统提示词

WhatsApp 通过 `groups` 和 `direct` 映射支持用于群组和直接聊天的 Telegram 风格系统提示词。

群组消息的解析层级：

有效的 `groups` 映射会先确定：如果账户定义了自己的 `groups`，它会完全替换根 `groups` 映射（不会深度合并）。随后提示词查找在得到的单一映射上执行：

1. **群组特定系统提示词** (`groups["<groupId>"].systemPrompt`)：当映射中存在该特定群组条目且其 `systemPrompt` 键已定义时使用。如果 `systemPrompt` 为空字符串（`""`），则会抑制通配符，不应用系统提示词。
2. **群组通配系统提示词** (`groups["*"].systemPrompt`)：当映射中完全不存在该特定群组条目，或者该条目存在但未定义 `systemPrompt` 键时使用。

直接消息的解析层级：

有效的 `direct` 映射会先确定：如果账户定义了自己的 `direct`，它会完全替换根 `direct` 映射（不会深度合并）。随后提示词查找在得到的单一映射上执行：

1. **直接聊天特定系统提示词** (`direct["<peerId>"].systemPrompt`)：当映射中存在该特定对端条目且其 `systemPrompt` 键已定义时使用。如果 `systemPrompt` 为空字符串（`""`），则会抑制通配符，不应用系统提示词。
2. **直接聊天通配系统提示词** (`direct["*"].systemPrompt`)：当映射中完全不存在该特定对端条目，或者该条目存在但未定义 `systemPrompt` 键时使用。

注意：`dms` 仍然是轻量级的每个 DM 历史覆盖桶（`dms.<id>.historyLimit`）；提示词覆盖位于 `direct` 下。

**与 Telegram 多账户行为的区别：** 在 Telegram 中，根级 `groups` 会在多账户设置中对所有账户有意被抑制——即使某些账户没有定义自己的 `groups`，也会这样做，以防止机器人收到其不属于的群组消息。WhatsApp 不使用此保护：根级 `groups` 和根级 `direct` 会始终被那些没有定义账户级覆盖的账户继承，而不管配置了多少账户。在多账户 WhatsApp 设置中，如果您希望每个账户都有自己的群组或直接聊天提示词，请显式在每个账户下定义完整映射，而不要依赖根级默认值。

重要行为：

- `channels.whatsapp.groups` 既是按群组配置映射，也是聊天级群组允许列表。在根级或账户级作用域中，`groups["*"]` 表示该作用域内“允许所有群组”。
- 仅当您已经希望该作用域允许所有群组时，才为群组添加通配 `systemPrompt`。如果您仍希望只有固定的一组群组 ID 具备资格，则不要将 `groups["*"]` 用作提示词默认值。请改为在每个显式允许列表中的群组条目上重复该提示词。
- 群组准入和发送者授权是两个独立的检查。`groups["*"]` 会扩大可进入群组处理的群组集合，但它本身不会授权这些群组中的每个发送者。发送者访问仍由 `channels.whatsapp.groupPolicy` 和 `channels.whatsapp.groupAllowFrom` 单独控制。
- `channels.whatsapp.direct` 对 DM 没有相同的副作用。`direct["*"]` 仅在某个 DM 已经被 `dmPolicy` 加上 `allowFrom` 或配对存储规则接纳后，提供默认的直接聊天配置。

示例：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        // 仅当根作用域应允许所有群组时使用。
        // 适用于所有未定义自己的 groups 映射的账户。
        "*": { systemPrompt: "所有群组的默认提示词。" },
      },
      direct: {
        // 适用于所有未定义自己的 direct 映射的账户。
        "*": { systemPrompt: "所有直接聊天的默认提示词。" },
      },
      accounts: {
        work: {
          groups: {
            // 此账户定义了自己的 groups，因此根 groups 会被完全
            // 替换。若要保留通配符，也请在此处显式定义 "*"。
            "120363406415684625@g.us": {
              requireMention: false,
              systemPrompt: "专注于项目管理。",
            },
            // 仅当此账户中的所有群组都应被允许时使用。
            "*": { systemPrompt: "work 群组的默认提示词。" },
          },
          direct: {
            // 此账户定义了自己的 direct 映射，因此根 direct 条目会被完全
            // 替换。若要保留通配符，也请在此处显式定义 "*"。
            "+15551234567": { systemPrompt: "某个特定 work 直接聊天的提示词。" },
            "*": { systemPrompt: "work 直接聊天的默认提示词。" },
          },
        },
      },
    },
  },
}
```

## 配置参考指针

主要参考：

- [Configuration reference - WhatsApp](/gateway/config-channels#whatsapp)

高频 WhatsApp 字段：

- access: `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- delivery: `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multi-account: `accounts.<id>.enabled`, `accounts.<id>.authDir`, account-level overrides
- operations: `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- session behavior: `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- prompts: `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## 相关

- [配对](/channels/pairing)
- [群组](/channels/groups)
- [安全性](/gateway/security)
- [渠道路由](/channels/channel-routing)
- [多代理路由](/concepts/multi-agent)
- [故障排除](/channels/troubleshooting)
