---
summary: "飞书机器人概览、功能及配置"
read_when:
  - 您想连接飞书/Lark 机器人时
  - 您正在配置飞书通道时
title: 飞书
---

# 飞书 / Lark

飞书/Lark 是一个一体化协作平台，团队可以在其中聊天、共享文档、管理日历并一起完成工作。

**状态：** 机器人私信与群聊生产就绪。WebSocket 为默认模式；Webhook 模式为可选。

---

## 快速开始

> **需要 OpenClaw 2026.4.24 或更高版本。** 运行 `openclaw --version` 检查。使用 `openclaw update` 升级。

<Steps>
  <Step title="运行通道设置向导">
  ```bash
  openclaw channels login --channel feishu
  ```
  使用飞书/Lark 移动应用扫描二维码以自动创建机器人。
  </Step>
  
  <Step title="设置完成后，重启网关以应用更改">
  ```bash
  openclaw gateway restart
  ```
  </Step>
</Steps>

---

## 访问控制

### 私信

配置 `dmPolicy` 以控制谁可以向机器人发送私信：

- `"pairing"` — 未知用户会收到配对码；通过 CLI 批准
- `"allowlist"` — 仅允许 `allowFrom` 中列出的用户聊天（默认为仅机器人所有者）
- `"open"` — 允许所有用户
- `"disabled"` — 禁用所有私信

**批准配对请求：**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### 群聊

**群策略** (`channels.feishu.groupPolicy`)：

| 值         | 行为                                   |
| ---------- | -------------------------------------- |
| `"open"`      | 响应群聊中的所有消息          |
| `"allowlist"` | 仅响应 `groupAllowFrom` 中的群组 |
| `"disabled"`  | 禁用所有群消息                |

默认值：`allowlist`

**提及要求** (`channels.feishu.requireMention`)：

- `true` — 需要 @提及（默认）
- `false` — 无需 @提及即可响应
- 每个群组可单独覆盖：`channels.feishu.groups.<chat_id>.requireMention`

---

## 群聊配置示例

### 允许所有群组，无需 @提及

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
    },
  },
}
```

### 允许所有群组，仍需 @提及

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      requireMention: true,
    },
  },
}
```

### 仅允许特定群组

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      // 群组 ID 格式如：oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

### 限制群组内的发送者

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["oc_xxx"],
      groups: {
        oc_xxx: {
          // 用户 open_id 格式如：ou_xxx
          allowFrom: ["ou_user1", "ou_user2"],
        },
      },
    },
  },
}
```

---

<a id="get-groupuser-ids"></a>

## 获取群组/用户 ID

### 群组 ID (`chat_id`，格式：`oc_xxx`)

在飞书/Lark 中打开群组，点击右上角菜单图标，进入 **设置**。群组 ID (`chat_id`) 显示在设置页面。

![获取群组 ID](/images/feishu-get-group-id.png)

### 用户 ID (`open_id`，格式：`ou_xxx`)

启动网关，向机器人发送私信，然后查看日志：

```bash
openclaw logs --follow
```

在日志中查找 `open_id`。你也可以检查待处理的配对请求：

```bash
openclaw pairing list feishu
```

---

## 常用命令

| 命令       | 描述                     |
| ---------- | ------------------------ |
| `/status`  | 显示机器人状态           |
| `/reset`   | 重置当前会话             |
| `/model`   | 显示或切换 AI 模型       |

> 飞书/Lark 不支持原生命令菜单，因此请以纯文本消息形式发送这些命令。

---

## 故障排除

### 机器人在群聊中无响应

1. 确保机器人已加入群组
2. 确保你 @提及了机器人（默认必需）
3. 验证 `groupPolicy` 未设置为 `"disabled"`
4. 检查日志：`openclaw logs --follow`

### 机器人未接收到消息

1. 确保机器人已在飞书开放平台/Lark 开发者平台发布并获得批准
2. 确保事件订阅包含 `im.message.receive_v1`
3. 确保选择 **持久连接**（WebSocket）
4. 确保已授予所有必需的权限范围
5. 确保网关正在运行：`openclaw gateway status`
6. 检查日志：`openclaw logs --follow`

### App Secret 泄露

1. 在飞书开放平台/Lark 开发者平台重置 App Secret
2. 在配置中更新该值
3. 重启网关：`openclaw gateway restart`

---

## 高级配置

### 多账户配置

```json5
{
  channels: {
    feishu: {
      defaultAccount: "main",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          name: "主机器人",
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          name: "备用机器人",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` 控制在外出 API 未指定 `accountId` 时使用哪个账户。

### 消息限制

- `textChunkLimit` — 外发文本分块大小（默认：`2000` 字符）
- `mediaMaxMb` — 媒体上传/下载限制（默认：`30` MB）

### 流式输出

飞书/Lark 支持通过交互式卡片进行流式回复。启用后，机器人会在生成文本时实时更新卡片。

```json5
{
  channels: {
    feishu: {
      streaming: true, // 启用流式卡片输出（默认：true）
      blockStreaming: true, // 启用块级流式输出（默认：true）
    },
  },
}
```

将 `streaming` 设为 `false` 可一次性发送完整回复。

### 配额优化

通过以下两个可选标志减少飞书/Lark API 调用次数：

- `typingIndicator`（默认 `true`）：设为 `false` 以跳过打字反应调用
- `resolveSenderNames`（默认 `true`）：设为 `false` 以跳过发送者资料查询

```json5
{
  channels: {
    feishu: {
      typingIndicator: false,
      resolveSenderNames: false,
    },
  },
}
```

### ACP 会话

飞书/Lark 支持用于私信和群组线程消息的 ACP。飞书/Lark 的 ACP 是基于文本命令驱动的——没有原生命令菜单，因此直接在对话中使用 `/acp ...` 消息即可。

#### 持久化 ACP 绑定

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "direct", id: "ou_1234567890" },
      },
    },
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "group", id: "oc_group_chat:topic:om_topic_root" },
      },
      acp: { label: "codex-feishu-topic" },
    },
  ],
}
```

#### 从聊天中启动 ACP

在飞书/Lark 私信或线程中：

```text
/acp spawn codex --thread here
```

`--thread here` 适用于私信和飞书/Lark 线程消息。绑定会话中的后续消息将直接路由到该 ACP 会话。

### 多智能体路由

使用 `bindings` 将飞书/Lark 私信或群组路由到不同智能体。

```json5
{
  agents: {
    list: [
      { id: "main" },
      { id: "agent-a", workspace: "/home/user/agent-a" },
      { id: "agent-b", workspace: "/home/user/agent-b" },
    ],
  },
  bindings: [
    {
      agentId: "agent-a",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "agent-b",
      match: {
        channel: "feishu",
        peer: { kind: "group", id: "oc_zzz" },
      },
    },
  ],
}
```

路由字段：

- `match.channel`: `"feishu"`
- `match.peer.kind`: `"direct"`（私信）或 `"group"`（群组聊天）
- `match.peer.id`: 用户 Open ID（`ou_xxx`）或群组 ID（`oc_xxx`）

请参见[获取群组/用户 ID](#get-groupuser-ids)了解查询方法。

---

## 配置参考

完整配置请参考：[网关配置](/gateway/configuration)

| 设置                                           | 描述                                | 默认值          |
| ---------------------------------------------- | ----------------------------------- | --------------- |
| `channels.feishu.enabled`                      | 启用/禁用通道                       | `true`          |
| `channels.feishu.domain`                       | API 域（`feishu` 或 `lark`）        | `feishu`        |
| `channels.feishu.connectionMode`               | 事件传输（`websocket` 或 `webhook`）| `websocket`     |
| `channels.feishu.defaultAccount`               | 外发路由的默认账户                  | `default`       |
| `channels.feishu.verificationToken`            | Webhook 模式必需                    | —               |
| `channels.feishu.encryptKey`                   | Webhook 模式必需                    | —               |
| `channels.feishu.webhookPath`                  | Webhook 路由路径                    | `/feishu/events` |
| `channels.feishu.webhookHost`                  | Webhook 绑定主机                    | `127.0.0.1`     |
| `channels.feishu.webhookPort`                  | Webhook 绑定端口                    | `3000`          |
| `channels.feishu.accounts.<id>.appId`          | 应用 ID                             | —               |
| `channels.feishu.accounts.<id>.appSecret`      | 应用密钥                            | —               |
| `channels.feishu.accounts.<id>.domain`         | 每账户域覆盖                        | `feishu`        |
| `channels.feishu.dmPolicy`                     | 私信策略                            | `allowlist`     |
| `channels.feishu.allowFrom`                    | 私信允许列表（open_id 列表）        | [BotOwnerId]    |
| `channels.feishu.groupPolicy`                  | 群组策略                            | `allowlist`     |
| `channels.feishu.groupAllowFrom`               | 群组允许列表                        | —               |
| `channels.feishu.requireMention`               | 群组中需要 @提及                   | `true`          |
| `channels.feishu.groups.<chat_id>.requireMention` | 每群组 @提及覆盖                 | 继承            |
| `channels.feishu.groups.<chat_id>.enabled`     | 启用/禁用特定群组                   | `true`          |
| `channels.feishu.textChunkLimit`               | 消息分块大小                        | `2000`          |
| `channels.feishu.mediaMaxMb`                   | 媒体大小限制                        | `30`            |
| `channels.feishu.streaming`                    | 流式卡片输出                        | `true`          |
| `channels.feishu.blockStreaming`               | 块级流式输出                        | `true`          |
| `channels.feishu.typingIndicator`              | 发送打字反应                        | `true`          |
| `channels.feishu.resolveSenderNames`           | 解析发送者显示名称                  | `true`          |

---

## 支持的消息类型

### 接收

- ✅ 文字
- ✅ 富文本（post）
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频/媒体
- ✅ 表情包

### 发送

- ✅ 文本
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频/媒体
- ✅ 交互式卡片（包括流式更新）
- ⚠️ 富文本（post 风格格式；不支持完整的飞书/Lark 创作能力）

### 线程及回复

- ✅ 内联回复
- ✅ 线程回复
- ✅ 回复媒体在回复线程消息时会保持线程感知

---

## 相关内容

- [渠道概览](/channels) — 所有支持的渠道
- [配对](/channels/pairing) — 私聊认证与配对流程
- [群组](/channels/groups) — 群聊行为与提及限制
- [渠道路由](/channels/channel-routing) — 消息会话路由
- [安全](/gateway/security) — 访问模型与加固
