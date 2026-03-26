---
summary: "飞书机器人概览、功能及配置"
read_when:
  - 您想连接飞书/Lark 机器人时
  - 您正在配置飞书通道时
title: 飞书
---

# 飞书机器人

飞书（Lark）是企业用于消息和协作的团队聊天平台。本插件通过平台的 WebSocket 事件订阅将 OpenClaw 连接到飞书/Lark 机器人，从而无需公开 Webhook URL 即可接收消息。

---

## 捆绑插件

Feishu 随当前的 OpenClaw 版本一起捆绑发布，因此无需单独安装插件。

如果您使用的是较旧的版本或自定义安装且未包含捆绑的 Feishu，请手动安装：

```bash
openclaw plugins install @openclaw/feishu
```

---

## 快速开始

添加飞书通道有两种方式：

### 方法一：引导安装（推荐）

如果您刚刚安装 OpenClaw，请运行引导程序：

```bash
openclaw onboard
```

向导将引导您完成：

1. 创建飞书应用并收集凭证
2. 在 OpenClaw 中配置应用凭证
3. 启动网关

✅ **配置完成后**，检查网关状态：

- `openclaw gateway status`
- `openclaw logs --follow`

### 方法二：命令行设置

如果已经完成初始安装，可通过 CLI 添加通道：

```bash
openclaw channels add
```

选择 **飞书**，然后输入 App ID 和 App Secret。

✅ **配置完成后**，管理网关：

- `openclaw gateway status`
- `openclaw gateway restart`
- `openclaw logs --follow`

---

## 第 1 步：创建飞书应用

### 1. 打开飞书开放平台

访问 [飞书开放平台](https://open.feishu.cn/app) 并登录。

Lark（国际版）租户请使用 [https://open.larksuite.com/app](https://open.larksuite.com/app) 并在飞书配置中设置 `domain: "lark"`。

### 2. 创建应用

1. 点击 **创建企业应用**
2. 填写应用名称和描述
3. 选择应用图标

![创建企业应用](../images/feishu-step2-create-app.png)

### 3. 复制凭证

在 **凭证与基础信息** 中复制：

- **App ID**（格式：`cli_xxx`）
- **App Secret**

❗ **重要：** 请妥善保管 App Secret，勿泄露。

![获取凭证](../images/feishu-step3-credentials.png)

### 4. 配置权限

在 **权限** 页面，点击 **批量导入** 并粘贴：

```json
{
  "scopes": {
    "tenant": [
      "aily:file:read",
      "aily:file:write",
      "application:application.app_message_stats.overview:readonly",
      "application:application:self_manage",
      "application:bot.menu:write",
      "cardkit:card:read",
      "cardkit:card:write",
      "contact:user.employee_id:readonly",
      "corehr:file:download",
      "event:ip_list",
      "im:chat.access_event.bot_p2p_chat:read",
      "im:chat.members:bot_access",
      "im:message",
      "im:message.group_at_msg:readonly",
      "im:message.p2p_msg:readonly",
      "im:message:readonly",
      "im:message:send_as_bot",
      "im:resource"
    ],
    "user": [
      "aily:file:read",
      "aily:file:write",
      "im:chat.access_event.bot_p2p_chat:read"
    ]
  }
}
```

![配置权限](../images/feishu-step4-permissions.png)

### 5. 启用机器人功能

在 **应用能力** > **机器人**：

1. 启用机器人功能
2. 设置机器人名称

![启用机器人功能](../images/feishu-step5-bot-capability.png)

### 6. 配置事件订阅

⚠️ **重要：** 在设置事件订阅前，请确保：

1. 已经运行 `openclaw channels add` 添加飞书
2. 网关正在运行（使用 `openclaw gateway status` 检查）

在 **事件订阅** 中：

1. 选择 **使用长连接接收事件**（WebSocket）
2. 添加事件：`im.message.receive_v1`

⚠️ 如果网关未运行，长连接设置可能无法保存。

![配置事件订阅](../images/feishu-step6-event-subscription.png)

### 7. 发布应用

1. 在 **版本管理与发布** 中创建版本
2. 提交审核并发布
3. 等待管理员审批（企业应用通常自动通过）

---

## 第 2 步：配置 OpenClaw

### 使用向导配置（推荐）

```bash
openclaw channels add
```

选择 **飞书**，粘贴您的 App ID 和 App Secret。

### 通过配置文件配置

编辑 `~/.openclaw/openclaw.json`：

```json5
{
  channels: {
    feishu: {
      enabled: true,
      dmPolicy: "pairing",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          name: "我的 AI 助手",
        },
      },
    },
  },
}
```

如果使用 `connectionMode: "webhook"`，需要同时设置 `verificationToken` 和 `encryptKey`。飞书 webhook 服务器默认绑定到 `127.0.0.1`，仅当您确实需要不同的绑定地址时，才设置 `webhookHost`。

#### 验证 Token 和加密密钥（Webhook 模式）

Webhook 模式下，在配置中同时设置 `channels.feishu.verificationToken` 和 `channels.feishu.encryptKey`。获取方法：

1. 登录飞书开放平台，打开您的应用  
2. 进入 **开发配置** → **事件与回调**  
3. 打开 **加密策略** 标签页  
4. 复制 **Verification Token** 和 **Encrypt Key**  

下图展示了 **Verification Token** 的位置，**Encrypt Key** 位于同一 **加密策略** 部分。

![验证 Token 位置](../images/feishu-verification-token.png)

### 通过环境变量配置

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
```

### Lark（国际版）域名

若您的租户是 Lark 国际版，需将域名设置为 `lark`（或完整域名字符串）。可在 `channels.feishu.domain` 或每个账户（`channels.feishu.accounts.<id>.domain`）配置。

```json5
{
  channels: {
    feishu: {
      domain: "lark",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
        },
      },
    },
  },
}
```

### 配额优化标记

您可以通过两种可选标记减少飞书 API 使用量：

- `typingIndicator`（默认 `true`）：设为 `false` 时跳过输入指示调用
- `resolveSenderNames`（默认 `true`）：设为 `false` 时跳过发送者资料查找

可在顶层或账户级配置：

```json5
{
  channels: {
    feishu: {
      typingIndicator: false,
      resolveSenderNames: false,
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          typingIndicator: true,
          resolveSenderNames: false,
        },
      },
    },
  },
}
```

---

## 第 3 步：启动并测试

### 1. 启动网关

```bash
openclaw gateway
```

### 2. 发送测试消息

在飞书中找到机器人，给它发送消息。

### 3. 批准配对

默认情况下，机器人会回复配对码。批准该配对：

```bash
openclaw pairing approve feishu <CODE>
```

批准后即可正常聊天。

---

## 概览

- **飞书机器人通道**：由网关管理的飞书机器人
- **确定性路由**：回复始终返回飞书
- **会话隔离**：私聊共享主会话，群聊独立隔离
- **WebSocket 连接**：通过飞书 SDK 建立长连接，无需公有 URL

---

## 访问控制

### 私信

- **默认**：`dmPolicy: "pairing"`（未知用户获取配对码）
- **批准配对**：

  ```bash
  openclaw pairing list feishu
  openclaw pairing approve feishu <CODE>
  ```

- **白名单模式**：设置 `channels.feishu.allowFrom`，指定允许的 Open ID 列表

### 群聊

**1. 群策略** (`channels.feishu.groupPolicy`)：

- `"open"` = 允许群内所有人
- `"allowlist"` = 仅允许 `groupAllowFrom`
- `"disabled"` = 禁用群消息

默认值：`allowlist`

**2. 提及要求** (`channels.feishu.requireMention`，可通过 `channels.feishu.groups.<chat_id>.requireMention` 覆盖)：

- 显式 `true` = 需要 @ 提及
- 显式 `false` = 无需提及即可响应
- 未设置且 `groupPolicy: "open"` = 默认 `false`
- 未设置且 `groupPolicy` 不是 `"open"` = 默认 `true`

---

## 群聊配置示例

### 允许所有群组，无需 @ 提及（open 群组默认）

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
    },
  },
}
```

### 允许所有群组，但仍需 @ 提及

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
      // 飞书群 ID（chat_id）格式类似：oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

### 限制某群中可发送消息的成员（发送者白名单）

除了允许该群外，**该群所有消息**还将根据发送者 open_id 筛选。只有在 `groups.<chat_id>.allowFrom` 列表中的用户消息会被处理，其他成员消息均被忽略（此为完全的发送者级别过滤，不仅限于控制命令如 /reset 或 /new）。

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["oc_xxx"],
      groups: {
        oc_xxx: {
          // 飞书用户 ID（open_id）格式类似：ou_xxx
          allowFrom: ["ou_user1", "ou_user2"],
        },
      },
    },
  },
}
```

---

## 获取群组/用户 ID

### 群组 ID（chat_id）

群组 ID 格式类似 `oc_xxx`。

**方法 1（推荐）**

1. 启动网关并在群内 @机器人
2. 运行 `openclaw logs --follow` 并查找 `chat_id`

**方法 2**

使用飞书 API 调试工具列出群聊。

### 用户 ID（open_id）

用户 ID 格式类似 `ou_xxx`。

**方法 1（推荐）**

1. 启动网关并向机器人发送私聊消息
2. 运行 `openclaw logs --follow` 并查找 `open_id`

**方法 2**

通过配对请求查看用户 Open ID：

```bash
openclaw pairing list feishu
```

---

## 常用命令

| 命令      | 说明           |
| --------- | -------------- |
| `/status` | 显示机器人状态 |
| `/reset`  | 重置会话       |
| `/model`  | 显示/切换模型  |

> 注意：飞书尚不支持原生命令菜单，命令必须以文本形式发送。

## 网关管理命令

| 命令                       | 说明                 |
| -------------------------- | -------------------- |
| `openclaw gateway status`  | 显示网关状态         |
| `openclaw gateway install` | 安装/启动网关服务    |
| `openclaw gateway stop`    | 停止网关服务         |
| `openclaw gateway restart` | 重启网关服务         |
| `openclaw logs --follow`   | 查看网关日志实时输出 |

---

## 故障排除

### 机器人在群聊中无响应

1. 确认机器人已加入该群
2. 确认消息已 @机器人（默认行为）
3. 检查 `groupPolicy` 未设置为 `"disabled"`
4. 查看日志：`openclaw logs --follow`

### 机器人未接收到消息

1. 确认应用已发布并审批通过
2. 确认事件订阅包含 `im.message.receive_v1`
3. 确认启用了 **长连接**
4. 确认应用权限设置完整
5. 确认网关正在运行：`openclaw gateway status`
6. 查看日志：`openclaw logs --follow`

### App Secret 泄露

1. 在飞书开放平台重置 App Secret
2. 更新配置中的 App Secret
3. 重启网关

### 消息发送失败

1. 确认应用拥有 `im:message:send_as_bot` 权限
2. 确认应用已发布
3. 查看详细错误日志

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

`defaultAccount` 控制当出站 API 未显式指定 `accountId` 时使用的飞书账户。

### 消息限制

- `textChunkLimit`：出站文本分块大小（默认 2000 字符）
- `mediaMaxMb`：多媒体上传/下载限制（默认 30MB）

### 流式输出

飞书支持通过交互卡片进行流式回复。启用后，机器人将随着文本生成不断更新卡片内容。

```json5
{
  channels: {
    feishu: {
      streaming: true, // 启用流式卡片输出（默认开启）
      blockStreaming: true, // 启用区块流式输出（默认开启）
    },
  },
}
```

将 `streaming` 设置为 `false` 则等待完整回复后一次发送。

### ACP 会话

飞书支持以下场景的 ACP：

- 私信
- 群话题会话

飞书 ACP 采用文本命令驱动。没有原生斜杠命令菜单，因此直接在会话中使用 `/acp ...` 消息。

#### 持久化 ACP 绑定

使用顶层类型化 ACP 绑定将飞书私信或话题会话固定到持久化 ACP 会话。

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

#### 从聊天中生成线程绑定的 ACP

在飞书私信或话题会话中，您可以在原地生成并绑定 ACP 会话：

```text
/acp spawn codex --thread here
```

注意：

- `--thread here` 适用于私信和飞书话题。
- 绑定后，私信/话题中的后续消息将直接路由到该 ACP 会话。
- v1 不支持非话题的普通群聊。

### 多智能体路由

使用 `bindings` 将飞书私聊或群聊路由到不同智能体。

```json5
{
  agents: {
    list: [
      { id: "main" },
      {
        id: "clawd-fan",
        workspace: "/home/user/clawd-fan",
        agentDir: "/home/user/.openclaw/agents/clawd-fan/agent",
      },
      {
        id: "clawd-xi",
        workspace: "/home/user/clawd-xi",
        agentDir: "/home/user/.openclaw/agents/clawd-xi/agent",
      },
    ],
  },
  bindings: [
    {
      agentId: "main",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "clawd-fan",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_yyy" },
      },
    },
    {
      agentId: "clawd-xi",
      match: {
        channel: "feishu",
        peer: { kind: "group", id: "oc_zzz" },
      },
    },
  ],
}
```

路由字段：

- `match.channel`：`"feishu"`
- `match.peer.kind`：`"direct"` 或 `"group"`
- `match.peer.id`：用户 Open ID（`ou_xxx`）或群组 ID（`oc_xxx`）

参见 [获取群组/用户 ID](#获取群组用户-id) 了解查询方法。

---

## 配置参考

完整配置见：[网关配置](/gateway/configuration)

主要选项：

| 设置                                              | 描述                                | 默认值           |
| ------------------------------------------------- | ----------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | 启用/禁用频道                        | `true`           |
| `channels.feishu.domain`                          | API 域名（`feishu` 或 `lark`）       | `feishu`         |
| `channels.feishu.connectionMode`                  | 事件传输模式                        | `websocket`      |
| `channels.feishu.defaultAccount`                  | 出站路由的默认账号 ID                | `default`        |
| `channels.feishu.verificationToken`               | webhook 模式必需                    | -                |
| `channels.feishu.encryptKey`                      | webhook 模式必需                    | -                |
| `channels.feishu.webhookPath`                     | webhook 路由路径                   | `/feishu/events` |
| `channels.feishu.webhookHost`                     | webhook 绑定主机                    | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | webhook 绑定端口                    | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | App ID                               | -                |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret                           | -                |
| `channels.feishu.accounts.<id>.domain`            | 单账号 API 域名覆盖                  | `feishu`         |
| `channels.feishu.dmPolicy`                        | 私聊策略                             | `pairing`        |
| `channels.feishu.allowFrom`                       | 私聊允许列表（open_id 列表）         | -                |
| `channels.feishu.groupPolicy`                     | 群组策略                             | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | 群组允许列表                         | -                |
| `channels.feishu.requireMention`                  | 默认是否需要 @mention               | conditional      |
| `channels.feishu.groups.<chat_id>.requireMention` | 单群组是否需要 @mention 覆盖         | inherited        |
| `channels.feishu.groups.<chat_id>.enabled`        | 启用群组                             | `true`           |
| `channels.feishu.textChunkLimit`                  | 消息分块大小                         | `2000`           |
| `channels.feishu.mediaMaxMb`                      | 媒体大小限制                         | `30`             |
| `channels.feishu.streaming`                       | 启用流式卡片输出                     | `true`           |
| `channels.feishu.blockStreaming`                  | 启用块流式输出                       | `true`           |

---

## dmPolicy 说明

| 值            | 行为                                     |
| ------------- | ---------------------------------------- |
| `"pairing"`   | **默认。** 未知用户需配对码并批准        |
| `"allowlist"` | 仅允许 `allowFrom` 中用户私聊            |
| `"open"`      | 允许所有用户（`allowFrom` 需包含 `"*"`） |
| `"disabled"`  | 禁用私聊                                 |

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

- ✅ 文字
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频/媒体
- ✅ 交互式卡片
- ⚠️ 富文本（post 样式格式及卡片，不支持任意飞书创作功能）

### 线程及回复

- ✅ 行内回复
- ✅ 飞书支持的主题线程回复（reply_in_thread）
- ✅ 媒体回复回复线程/主题消息时保持线程信息

## 运行时操作接口

飞书当前暴露以下运行时操作：

- `send`
- `read`
- `edit`
- `thread-reply`
- `pin`
- `list-pins`
- `unpin`
- `member-info`
- `channel-info`
- `channel-list`
- 配置启用反应时的 `react` 和 `reactions`
