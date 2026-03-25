---
summary: "WhatsApp 渠道支持、访问控制、投递行为和操作"
read_when:
  - 处理 WhatsApp/web 渠道行为或收件箱路由时
title: "WhatsApp"
---

# WhatsApp（Web 渠道）

状态：通过 WhatsApp Web（Baileys）实用的生产环境准备就绪。网关拥有关联会话。

## Install (on demand)

- Onboarding (`openclaw onboard`) 和 `openclaw channels add --channel whatsapp`
  会在您第一次选择它时提示安装 WhatsApp 插件。
- `openclaw channels login --channel whatsapp` 也会在插件尚不存在时提供安装流程。
- Dev channel + git checkout：默认为本地插件路径。
- Stable/Beta：默认为 npm 包 `@openclaw/whatsapp`。

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

- 网关拥有 WhatsApp 套接字和重连循环。
- 出站发送要求目标账户存在活跃的 WhatsApp 监听器。
- 状态和广播聊天被忽略（`@status`，`@broadcast`）。
- 直接聊天使用私信会话规则（`session.dmScope`；默认 `main` 合并私信到代理主会话）。
- 群组会话隔离（`agent:<agentId>:whatsapp:group:<jid>`）。

## 访问控制与激活

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

    - 配对信息存储在渠道允许存储中，并与配置的 `allowFrom` 合并
    - 如果没有配置允许列表，则默认允许关联的自号码
    - 出站的 `fromMe` 私信不会自动配对

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

    位置和联系人负载在路由前被规范为文本上下文。

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

## 回复确认表情

WhatsApp 支持通过 `channels.whatsapp.ackReaction` 在入站接收后即时发送确认表情。

```json5
{
  channels: {
    whatsapp: {
      ackReaction: {
        emoji: "👀",
        direct: true,
        group: "mentions", // always | mentions | never
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

## 故障排除

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

## 配置参考指针

主要参考：

- [配置参考 - WhatsApp](/gateway/configuration-reference#whatsapp)

高频 WhatsApp 字段：

- 访问：`dmPolicy`、`allowFrom`、`groupPolicy`、`groupAllowFrom`、`groups`
- 投递：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`sendReadReceipts`、`ackReaction`
- 多账户：`accounts.<id>.enabled`、`accounts.<id>.authDir`、账户级覆盖
- 操作：`configWrites`、`debounceMs`、`web.enabled`、`web.heartbeatSeconds`、`web.reconnect.*`
- 会话行为：`session.dmScope`、`historyLimit`、`dmHistoryLimit`、`dms.<id>.historyLimit`

## 相关

- [配对](/channels/pairing)
- [渠道路由](/channels/channel-routing)
- [多代理路由](/concepts/multi-agent)
- [故障排除](/channels/troubleshooting)
