---
summary: "Microsoft Teams 机器人支持状态、功能及配置"
read_when:
  - 处理 Microsoft Teams 频道功能时
title: "Microsoft Teams"
---

# Microsoft Teams （插件）

> “进入此处者，皆放弃一切希望。”

更新时间：2026-01-21

状态：支持文本和私聊附件；频道/群组文件发送需要 `sharePointSiteId` + Graph 权限（详见[群聊中发送文件](#sending-files-in-group-chats)）。投票通过自适应卡（Adaptive Cards）发送。

## 需要插件

Microsoft Teams 作为插件提供，不包含于核心安装包中。

**重大变更 (2026.1.15)：** Microsoft Teams 已移出核心包。如果您使用它，必须安装该插件。

说明理由：保持核心安装包更轻量，并允许 Microsoft Teams 依赖项独立更新。

使用 CLI 安装（npm 注册表）：

```bash
openclaw plugins install @openclaw/msteams
```

本地代码检出时（从 git 仓库运行）：

```bash
openclaw plugins install ./extensions/msteams
```

如果在设置过程中选择了 Teams 并且检测到 git 检出，
OpenClaw 将自动提供本地安装路径。

详情参见：[插件](/tools/plugin)

## 快速设置（初学者）

1. 安装 Microsoft Teams 插件。
2. 创建一个 **Azure Bot**（App ID + 客户端密钥 + 租户 ID）。
3. 使用上述凭据配置 OpenClaw。
4. 通过公网 URL 或隧道公开 `/api/messages`（默认端口 3978）。
5. 安装 Teams 应用包并启动网关。

最小配置示例：

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      appPassword: "<APP_PASSWORD>",
      tenantId: "<TENANT_ID>",
      webhook: { port: 3978, path: "/api/messages" },
    },
  },
}
```

注意：群聊默认被阻止（`channels.msteams.groupPolicy: "allowlist"`）。若要允许群组回复，请设置 `channels.msteams.groupAllowFrom`，或使用 `groupPolicy: "open"` 允许所有成员（需 @提及）。

## 目标

- 通过 Teams 私聊、群组聊天或频道与 OpenClaw 对话。
- 保持路由确定性：回复总是返回到消息来源的频道。
- 默认采用安全的频道行为（需 @提及，除非另行配置）。

## 配置写入权限

默认情况下，Microsoft Teams 允许通过 `/config set|unset` 命令触发的配置更新写入（需设置 `commands.config: true`）。

关闭方法：

```json5
{
  channels: { msteams: { configWrites: false } },
}
```

## 访问控制（私聊 + 群组）

**私聊访问**

- 默认：`channels.msteams.dmPolicy = "pairing"`。未知发送者会被忽略，直至获批。
- `channels.msteams.allowFrom` 建议使用稳定的 AAD 对象 ID。
- UPN/显示名称可变，默认不开启直接匹配，仅在设置 `channels.msteams.dangerouslyAllowNameMatching: true` 时启用。
- 配置向导可根据凭据权限通过 Microsoft Graph 查询并解析名称到 ID。

**群组访问**

- 默认：`channels.msteams.groupPolicy = "allowlist"`（阻止，除非添加 `groupAllowFrom`）。未设置时可用 `channels.defaults.groupPolicy` 覆盖默认值。
- `channels.msteams.groupAllowFrom` 控制哪些发送者可在群聊/频道触发（回退至 `channels.msteams.allowFrom`）。
- 设置 `groupPolicy: "open"` 允许所有成员（默认仍需 @提及）。
- 若不允许任何频道，设置 `channels.msteams.groupPolicy: "disabled"`。

示例：

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["user@org.com"],
    },
  },
}
```

**Teams + 频道白名单**

- 通过在 `channels.msteams.teams` 下列出团队和频道限制组/频道回复范围。
- 键应使用稳定的团队 ID 和频道会话 ID。
- 当 `groupPolicy="allowlist"` 且存在团队白名单时，仅接受列出的团队/频道（需 @提及）。
- 配置向导接收 `Team/Channel` 条目并为您存储。
- 启动时，OpenClaw 会根据 Graph 权限解析团队/频道和用户白名单名称到 ID，并记录映射；未解析的团队/频道名称默认为保留原文，但默认不参与路由，除非启用 `channels.msteams.dangerouslyAllowNameMatching: true`。

示例：

```json5
{
  channels: {
    msteams: {
      groupPolicy: "allowlist",
      teams: {
        "My Team": {
          channels: {
            General: { requireMention: true },
          },
        },
      },
    },
  },
}
```

## 工作原理

1. 安装 Microsoft Teams 插件。
2. 创建一个 **Azure Bot**（App ID + 密钥 + 租户 ID）。
3. 构建一个 **Teams 应用包**，引用该 Bot 并包含以下的 RSC 权限。
4. 将 Teams 应用上传/安装到团队（或个人范围用于私聊）。
5. 在 `~/.openclaw/openclaw.json`（或环境变量）中配置 `msteams`，启动网关。
6. 网关默认监听 Bot Framework webhook 请求 `/api/messages`。

## Azure Bot 设置（前提条件）

配置 OpenClaw 前，需要先创建 Azure Bot 资源。

### 第 1 步：创建 Azure Bot

1. 访问 [创建 Azure Bot](https://portal.azure.com/#create/Microsoft.AzureBot)
2. 填写 **基础** 页签内容：

   | 字段            | 内容                                                          |
   | --------------- | ------------------------------------------------------------- |
   | **Bot 句柄**    | 机器人名称，例如 `openclaw-msteams`（必须唯一）                 |
   | **订阅**        | 选择您的 Azure 订阅                                            |
   | **资源组**      | 新建或复用已有资源组                                           |
   | **定价层**      | 选择 **Free** 适合开发/测试                                    |
   | **应用类型**    | **Single Tenant**（推荐，详见说明）                            |
   | **创建类型**    | **创建新的 Microsoft 应用 ID**                                 |

> **弃用通知：** 2025-07-31 后弃用新建多租户 Bot。新 Bot 请使用单租户。

3. 点击 **检查 + 创建** → **创建**（等待约 1-2 分钟）

### 第 2 步：获取凭据

1. 打开您的 Azure Bot 资源 → **配置**
2. 复制 **Microsoft 应用 ID**，即为 `appId`
3. 点击 **管理密码** → 进入 App 注册
4. 在 **证书和机密** → **新客户端机密** 处复制 **值**，即为 `appPassword`
5. 前往 **概览** → 复制 **目录 (租户) ID** ，即为 `tenantId`

### 第 3 步：配置消息端点

1. 在 Azure Bot → **配置**
2. 设置 **消息端点** 为您的 webhook URL：

   - 生产环境: `https://your-domain.com/api/messages`
   - 本地开发: 使用隧道（详见[本地开发隧道](#local-development-tunneling)）

### 第 4 步：启用 Teams 通道

1. 在 Azure Bot → **通道**
2. 点击 **Microsoft Teams** → 配置 → 保存
3. 同意服务条款

## 本地开发（隧道）

Teams 无法访问 `localhost`，本地开发时需使用隧道：

**方案 A：ngrok**

```bash
ngrok http 3978
# 复制 https URL，例如 https://abc123.ngrok.io
# 设置消息端点为：https://abc123.ngrok.io/api/messages
```

**方案 B：Tailscale Funnel**

```bash
tailscale funnel 3978
# 使用您的 Tailscale funnel URL 作为消息端点
```

## Teams 开发者门户（替代方案）

无需手动制作 manifest ZIP，可通过 [Teams Developer Portal](https://dev.teams.microsoft.com/apps)：

1. 点击 **+ 新应用**
2. 填写基本信息（名称、描述、开发者信息）
3. 转到 **应用功能** → **Bot**
4. 选择 **手动输入 Bot ID** 并粘贴 Azure Bot App ID
5. 勾选权限范围：**个人**、**团队**、**群组聊天**
6. 点击 **分发** → **下载应用包**
7. 在 Teams 中：**应用** → **管理你的应用** → **上传自定义应用** → 选择 ZIP 包

这通常比手动编辑 JSON manifest 更简单。

## 测试机器人

**方案 A：Azure Web Chat（先验证 webhook）**

1. 在 Azure 门户 → 您的 Azure Bot 资源 → **Web Chat 测试**
2. 发送消息，确认收到响应
3. 验证 webhook 是否正常，在 Teams 配置前先确认通畅

**方案 B：Teams（安装应用后）**

1. 安装 Teams 应用（侧载或组织目录）
2. 在 Teams 查找机器人并发送私聊消息
3. 检查网关日志是否有收到请求

## 设置（最简文本消息）

1. **安装 Microsoft Teams 插件**  
   - 从 npm 安装：`openclaw plugins install @openclaw/msteams`  
   - 本地代码安装：`openclaw plugins install ./extensions/msteams`

2. **机器人注册**  
   - 创建一个 Azure Bot（见上文），并记录以下信息：  
     - 应用 ID  
     - 客户端密钥（App password）  
     - 租户 ID（单租户）

3. **Teams 应用 manifest**  
   - 包含一个 `bot` 条目，`botId = <App ID>`  
   - 权限范围：`personal`, `team`, `groupChat`  
   - `supportsFiles: true`（个人作用域文件处理必需）  
   - 添加资源特定权限（RSC，见下文）  
   - 创建图标：`outline.png`（32x32），`color.png`（192x192）  
   - 将 `manifest.json`、`outline.png`、`color.png` 打包为 ZIP

4. **配置 OpenClaw**

   ```json5
   {
     channels: {
       msteams: {
         enabled: true,
         appId: "<APP_ID>",
         appPassword: "<APP_PASSWORD>",
         tenantId: "<TENANT_ID>",
         webhook: { port: 3978, path: "/api/messages" },
       },
     },
   }
   ```

   也可以使用环境变量替代配置项：  
   - `MSTEAMS_APP_ID`  
   - `MSTEAMS_APP_PASSWORD`  
   - `MSTEAMS_TENANT_ID`

5. **机器人端点**  
   - 设置 Azure Bot 消息端点为：  
     - `https://<host>:3978/api/messages`（或您指定的路径/端口）

6. **启动网关**  
   - 安装插件且 `msteams` 配置存在凭据时，Teams 频道自动启动

## 历史上下文

- `channels.msteams.historyLimit` 控制最近的频道/群组消息数量，用于上下文提示。默认 50，设为 0 表示禁用。
- 回退至 `messages.groupChat.historyLimit`。
- 私聊历史消息长度限制支持 `channels.msteams.dmHistoryLimit`（用户换轮数），用户特定覆盖为 `channels.msteams.dms["<用户ID>"].historyLimit`。

## 当前 Teams RSC 权限（Manifest）

以下是 Teams 应用 manifest 中的**资源特定权限**，仅适用于应用安装的团队或聊天内。

**频道（团队作用域）：**

- `ChannelMessage.Read.Group`（应用权限）- 接收所有频道消息（无需 @提及）  
- `ChannelMessage.Send.Group`（应用权限）  
- `Member.Read.Group`（应用权限）  
- `Owner.Read.Group`（应用权限）  
- `ChannelSettings.Read.Group`（应用权限）  
- `TeamMember.Read.Group`（应用权限）  
- `TeamSettings.Read.Group`（应用权限）  

**群聊：**

- `ChatMessage.Read.Chat`（应用权限）- 接收所有群聊消息（无需 @提及）

## 示例 Teams Manifest（隐去敏感信息）

最低有效示例，含必需字段，ID 和 URL 请替换。

```json5
{
  $schema: "https://developer.microsoft.com/en-us/json-schemas/teams/v1.23/MicrosoftTeams.schema.json",
  manifestVersion: "1.23",
  version: "1.0.0",
  id: "00000000-0000-0000-0000-000000000000",
  name: { short: "OpenClaw" },
  developer: {
    name: "Your Org",
    websiteUrl: "https://example.com",
    privacyUrl: "https://example.com/privacy",
    termsOfUseUrl: "https://example.com/terms",
  },
  description: { short: "OpenClaw in Teams", full: "OpenClaw in Teams" },
  icons: { outline: "outline.png", color: "color.png" },
  accentColor: "#5B6DEF",
  bots: [
    {
      botId: "11111111-1111-1111-1111-111111111111",
      scopes: ["personal", "team", "groupChat"],
      isNotificationOnly: false,
      supportsCalling: false,
      supportsVideo: false,
      supportsFiles: true,
    },
  ],
  webApplicationInfo: {
    id: "11111111-1111-1111-1111-111111111111",
  },
  authorization: {
    permissions: {
      resourceSpecific: [
        { name: "ChannelMessage.Read.Group", type: "Application" },
        { name: "ChannelMessage.Send.Group", type: "Application" },
        { name: "Member.Read.Group", type: "Application" },
        { name: "Owner.Read.Group", type: "Application" },
        { name: "ChannelSettings.Read.Group", type: "Application" },
        { name: "TeamMember.Read.Group", type: "Application" },
        { name: "TeamSettings.Read.Group", type: "Application" },
        { name: "ChatMessage.Read.Chat", type: "Application" },
      ],
    },
  },
}
```

### Manifest 注意事项（必填字段）

- `bots[].botId` **必须**与 Azure Bot App ID 相符。
- `webApplicationInfo.id` **必须**与 Azure Bot App ID 相符。
- `bots[].scopes` 必须包含计划使用的范围（`personal`, `team`, `groupChat`）。
- `bots[].supportsFiles: true` 是个人作用域文件处理必需项。
- `authorization.permissions.resourceSpecific` 必须包含频道读写权限，才能访问频道消息。

### 更新已安装应用

1. 修改 `manifest.json` 加入新设置
2. **版本号递增**，如 `1.0.0` → `1.1.0`
3. 重新打包 `manifest.json` 和图标 (`outline.png`, `color.png`)
4. 上传新版本：
   - **方法 A（Teams 管理中心）**：Teams 管理中心 → Teams 应用 → 管理应用 → 找到您的应用 → 上传新版本
   - **方法 B（侧载）**：Teams → 应用 → 管理你的应用 → 上传自定义应用
5. **针对团队频道：** 需在每个团队中重新安装应用以应用新权限
6. **完全退出并重启 Teams**（非仅关闭窗口）以清理缓存的应用元数据

## 功能对比：仅 RSC 与 Graph API

### 使用 **仅 Teams RSC**（安装应用，无 Graph API 权限）

支持：

- 读取频道消息**文本**内容。
- 发送频道消息**文本**内容。
- 接收**私聊（DM）**中的文件附件。

不支持：

- 频道/群组的**图片或文件内容**（载荷仅含 HTML 占位符）。
- 下载存储于 SharePoint/OneDrive 的附件。
- 阅读历史消息（仅限实时 webhook 事件）。

### 使用 **Teams RSC + Microsoft Graph 应用权限**

增加支持：

- 下载托管内容（消息中粘贴的图片）。
- 下载存储在 SharePoint/OneDrive 的文件附件。
- 通过 Graph 阅读频道/聊天历史消息。

### RSC 与 Graph API 对比

| 能力                      | 仅 RSC 权限                  | Graph API                                |
| ------------------------- | ---------------------------- | --------------------------------------- |
| **实时消息**              | 支持（通过 webhook）         | 不支持（仅轮询）                        |
| **历史消息**              | 不支持                      | 支持（可查询历史）                       |
| **配置复杂度**            | 仅应用 manifest             | 需管理员同意 + Token 流程              |
| **离线工作能力**          | 不支持（必须在线）           | 支持（可随时查询）                       |

**总结：**RSC 用于实时接收消息，Graph API 用于历史访问。若需离线时补充未读消息，需要管理员权限的 Graph API `ChannelMessage.Read.All`。

## 启用 Graph 权限获取频道多媒体及历史消息（频道必需）

需启用 Microsoft Graph 权限并授予管理员同意，步骤：

1. 在 Entra ID（Azure AD）应用注册中添加 Microsoft Graph **应用权限**：  
   - `ChannelMessage.Read.All`（频道附件与历史消息）  
   - `Chat.Read.All` 或 `ChatMessage.Read.All`（群聊）

2. 为租户授予管理员同意。
3. 升级 Teams 应用 **manifest 版本**，重新上传，**重新安装应用**。
4. **完全退出并重启 Teams**，清除缓存的应用元数据。

**另外用户@提及：**会话内的用户@提及无需额外权限。如需动态查找及@不在会话内的用户，添加 `User.Read.All`（应用权限）并授予管理员同意。

## 已知限制

### Webhook 超时

Teams 通过 HTTP webhook 投递消息。如处理时间过长（例如 LLM 响应慢）：

- 网关超时
- Teams 可能重复投递（导致重复消息）
- 回复丢失

OpenClaw 通过快速返回并主动推送回复缓解此问题，但极慢的响应可能仍会出问题。

### 格式支持

Teams Markdown 比 Slack 或 Discord 受限：

- 支持基本格式：**加粗**、_斜体_、`代码`、链接
- 复杂 Markdown（表格、嵌套列表）可能渲染异常
- 支持 Adaptive Cards 用于投票及自定义卡片（详见下文）

## 配置

关键配置项（详见 `/gateway/configuration` 共享频道模式）：

- `channels.msteams.enabled`: 启用/禁用该频道。
- `channels.msteams.appId`, `channels.msteams.appPassword`, `channels.msteams.tenantId`: 机器人凭证。
- `channels.msteams.webhook.port`（默认 `3978`）
- `channels.msteams.webhook.path`（默认 `/api/messages`）
- `channels.msteams.dmPolicy`: `pairing | allowlist | open | disabled`（默认：pairing）
- `channels.msteams.allowFrom`: 私聊允许列表（推荐 AAD 对象 ID）。安装向导在有 Graph 访问时会将名称解析为 ID。
- `channels.msteams.dangerouslyAllowNameMatching`: 紧急开关，重新启用可变的 UPN/显示名匹配及直接团队/频道名称路由。
- `channels.msteams.textChunkLimit`: 发送文本分块大小。
- `channels.msteams.chunkMode`: `length`（默认）或 `newline`，先按空白行分割（段落边界）后再按长度分割。
- `channels.msteams.mediaAllowHosts`: 入站附件允许的主机名白名单（默认为 Microsoft/Teams 域）。
- `channels.msteams.mediaAuthAllowHosts`: 重试媒体请求时附加 Authorization 头的主机名白名单（默认为 Graph + Bot Framework 域）。
- `channels.msteams.requireMention`: 频道/群组中是否强制 @提及（默认 true）。
- `channels.msteams.replyStyle`: `thread | top-level`（详见 [回复风格](#reply-style-threads-vs-posts)）。
- `channels.msteams.teams.<teamId>.replyStyle`: 按团队覆盖设置。
- `channels.msteams.teams.<teamId>.requireMention`: 按团队覆盖设置。
- `channels.msteams.teams.<teamId>.tools`: 默认的团队级工具策略覆盖（`allow`/`deny`/`alsoAllow`），在无频道覆盖时使用。
- `channels.msteams.teams.<teamId>.toolsBySender`: 默认团队级别按发送者的工具策略覆盖（支持 `"*"` 通配符）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.replyStyle`: 按频道覆盖设置。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.requireMention`: 按频道覆盖设置。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.tools`: 按频道工具策略覆盖（`allow`/`deny`/`alsoAllow`）。
- `channels.msteams.teams.<teamId>.channels.<conversationId>.toolsBySender`: 按频道按发送者的工具策略覆盖（支持 `"*"` 通配符）。
- `toolsBySender` 的 key 应使用显式前缀：
  `id:`, `e164:`, `username:`, `name:`（遗留不带前缀的 key 仍映射到 `id:`）。
- `channels.msteams.sharePointSiteId`: 群聊及频道文件上传的 SharePoint 站点 ID（详见 [群聊中发送文件](#sending-files-in-group-chats)）。

## 路由及会话

- 会话键遵循标准代理格式（详见 [/concepts/session](/concepts/session)）：
  - 私聊共用主会话：`agent:<agentId>:<mainKey>`
  - 频道/群组消息按会话 ID 区分：  
    - `agent:<agentId>:msteams:channel:<conversationId>`  
    - `agent:<agentId>:msteams:group:<conversationId>`

## 回复风格：线程 vs 帖子

Teams 最近推出两种频道 UI 样式，数据模型相同：

| 样式            | 描述                                       | 推荐设置 `replyStyle`  |
| --------------- | ------------------------------------------ | ---------------------- |
| **帖子**（经典） | 消息以卡片形式出现，下方有线程回复        | `thread`（默认）       |
| **线程**（Slack 式） | 消息线性流动，更像 Slack                 | `top-level`            |

**问题：** Teams API 不支持查询频道使用哪种 UI 样式。选错 `replyStyle` 会导致：

- 线程样式频道用 `thread` → 回复会嵌套显示不协调
- 帖子样式频道用 `top-level` → 回复变成独立顶层帖子，非线程内

**解决方案：** 按频道实际 UI 设置 `replyStyle`：

```json5
{
  channels: {
    msteams: {
      replyStyle: "thread",
      teams: {
        "19:abc...@thread.tacv2": {
          channels: {
            "19:xyz...@thread.tacv2": {
              replyStyle: "top-level",
            },
          },
        },
      },
    },
  },
}
```

## 附件与图片

**当前限制：**

- **私聊（DM）：** 支持通过 Teams 机器人文件 API 的图片和附件。
- **频道/群组：** 附件存储于 M365（SharePoint/OneDrive），Webhook 载荷仅含 HTML 占位符，不含实际文件字节。**需 Graph API 权限**才能下载频道附件。

无 Graph 权限时，频道消息中的图片以纯文本形式接收（无法访问图片内容）。默认只下载 Microsoft/Teams 域的媒体，可通过 `channels.msteams.mediaAllowHosts` 覆盖（使用 `["*"]` 允许任意域）。  
只有在 `channels.msteams.mediaAuthAllowHosts` 中的域才附加 Authorization 头（默认含 Graph + Bot Framework 域）。该列表应保持严格，避免多租户后缀。

## 在群聊中发送文件

机器人可以使用内置的 FileConsentCard 流程发送私聊文件。但**群聊/频道发送文件**需要额外配置：

| 场景                        | 发送方式                      | 所需设置                             |
| --------------------------- | ---------------------------- | ----------------------------------- |
| **私聊**                    | FileConsentCard → 用户接受 → 机器人上传 | 开箱即用                           |
| **群聊/频道**               | 上传到 SharePoint → 发送共享链接 | 需要 `sharePointSiteId` + Graph 权限 |
| **任意场景，图片**           | Base64 编码内联               | 开箱即用                           |

### 为什么群聊需 SharePoint

机器人没有个人 OneDrive 驱动（应用身份无 `/me/drive` Graph API 端点），群聊/频道文件需上传到**SharePoint 站点**并创建共享链接。

### 设置步骤

1. 在 Entra ID（Azure AD）应用注册中添加 Graph API 权限：  
   - `Sites.ReadWrite.All`（应用） - 上传文件到 SharePoint  
   - `Chat.Read.All`（应用，选填） - 实现按用户共享链接

2. 为租户授予管理员同意。

3. 获取 SharePoint 站点 ID：

   ```bash
   # 可使用 Graph Explorer 或带有效授权的 curl：
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/{hostname}:/{site-path}"

   # 示例：针对 "contoso.sharepoint.com/sites/BotFiles" 站点
   curl -H "Authorization: Bearer $TOKEN" \
     "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com:/sites/BotFiles"

   # 响应含 "id": "contoso.sharepoint.com,guid1,guid2"
   ```

4. 配置 OpenClaw：

   ```json5
   {
     channels: {
       msteams: {
         // ... 其他配置 ...
         sharePointSiteId: "contoso.sharepoint.com,guid1,guid2",
       },
     },
   }
   ```

### 共享权限行为

| 权限组合                               | 共享行为                                         |
| ------------------------------------ | ------------------------------------------------ |
| 仅 `Sites.ReadWrite.All`               | 组织内共享链接（组织中任何人均可访问）             |
| `Sites.ReadWrite.All` + `Chat.Read.All` | 按用户共享链接（仅聊天成员可访问）                  |

按用户共享更安全，仅聊天成员有权访问。无 `Chat.Read.All` 权限时，回退为组织范围共享。

### 退回行为

| 场景                                   | 结果                                       |
| ------------------------------------ | ------------------------------------------ |
| 群聊 + 文件 + 配置了 `sharePointSiteId` | 上传至 SharePoint，发送共享链接             |
| 群聊 + 文件 + 未配置 `sharePointSiteId`   | 尝试 OneDrive 上传（可能失败），发送文本消息 |
| 个人聊天 + 文件                        | 使用 FileConsentCard 流程（无须 SharePoint） |
| 任意场景 + 图片                        | Base64 内联发送（无须 SharePoint）           |

### 文件存储位置

上传文件存储于配置的 SharePoint 站点默认文档库中的 `/OpenClawShared/` 文件夹。

## 投票（自适应卡）

OpenClaw 使用 Adaptive Cards 发送 Teams 投票（Teams 无原生投票 API）。

- CLI 示例：`openclaw message poll --channel msteams --target conversation:<id> ...`
- 投票数据保存在 `~/.openclaw/msteams-polls.json`。
- 网关需保持在线以记录投票。
- 目前不自动发布投票结果摘要（需自行查看存储文件）。

## 自适应卡（任意卡片）

使用 `message` 工具或 CLI 向 Teams 用户或会话发送任意 Adaptive Card JSON。

`card` 参数接收 Adaptive Card JSON 对象，提供时消息文本可选。

**Agent 工具示例：**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:<id>",
  card: {
    type: "AdaptiveCard",
    version: "1.5",
    body: [{ type: "TextBlock", text: "Hello!" }],
  },
}
```

**CLI 示例：**

```bash
openclaw message send --channel msteams \
  --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello!"}]}'
```

详见 [Adaptive Cards 文档](https://adaptivecards.io/) 获取卡片架构和示例。目标格式详见下文。

## 目标格式

MSTeams 目标使用前缀区分用户和会话：

| 目标类型      | 格式                          | 示例                                                  |
| ------------- | ----------------------------- | ----------------------------------------------------- |
| 用户（ID）   | `user:<aad-object-id>`        | `user:40a1a0ed-4ff2-4164-a219-55518990c197`          |
| 用户（名称） | `user:<display-name>`          | `user:John Smith`（需 Graph API 支持）                |
| 群组/频道    | `conversation:<conversation-id>` | `conversation:19:abc123...@thread.tacv2`               |
| 群组/频道（原始） | `<conversation-id>`          | `19:abc123...@thread.tacv2`（包含 `@thread` 时可用） |

**CLI 使用示例：**

```bash
# 按用户 ID 发送
openclaw message send --channel msteams --target "user:40a1a0ed-..." --message "Hello"

# 按用户显示名发送（触发 Graph 查询）
openclaw message send --channel msteams --target "user:John Smith" --message "Hello"

# 发送到群聊或频道
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" --message "Hello"

# 发送 Adaptive Card 到会话
openclaw message send --channel msteams --target "conversation:19:abc...@thread.tacv2" \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Hello"}]}'
```

**Agent 工具示例：**

```json5
{
  action: "send",
  channel: "msteams",
  target: "user:John Smith",
  message: "Hello!",
}
```

```json5
{
  action: "send",
  channel: "msteams",
  target: "conversation:19:abc...@thread.tacv2",
  card: {
    type: "AdaptiveCard",
    version: "1.5",
    body: [{ type: "TextBlock", text: "Hello" }],
  },
}
```

注意：若无 `user:` 前缀，名称默认为组/团队解析。按名称给个人发送时请始终使用 `user:` 前缀。

## 主动消息

- 仅在用户首次交互后可发送主动消息，因为需存储会话引用。
- 详见 `/gateway/configuration` 的 `dmPolicy` 和允许列表设置。

## 团队和频道 ID（常见误区）

Teams URL 查询参数中的 `groupId` **不是**用于配置的团队 ID。请从 URL 路径提取：

**团队 URL 示例：**

```
https://teams.microsoft.com/l/team/19%3ABk4j...%40thread.tacv2/conversations?groupId=...
                                    └────────────────────────────┘
                                    团队 ID（需解码）
```

**频道 URL 示例：**

```
https://teams.microsoft.com/l/channel/19%3A15bc...%40thread.tacv2/ChannelName?groupId=...
                                      └─────────────────────────┘
                                      频道 ID（需解码）
```

**配置时：**

- 团队 ID = 路径 `/team/` 后的段（URL 解码）
- 频道 ID = 路径 `/channel/` 后的段（URL 解码）
- 忽略 `groupId` 查询参数

## 私有频道

机器人在私有频道支持有限：

| 功能                      | 标准频道支持          | 私有频道支持          |
| ------------------------- | --------------------- | --------------------- |
| 机器人安装               | 是                    | 有限制                |
| 实时消息（Webhook）       | 支持                  | 可能不支持            |
| RSC 权限                 | 支持                  | 可能表现不同          |
| @提及                    | 支持                  | 只要机器人可访问即可   |
| Graph API 历史访问       | 支持                  | 仅限权限下支持        |

**若私有频道不支持，建议：**

1. 使用标准频道与机器人交互
2. 使用私聊 - 用户始终能私聊机器人
3. 使用 Graph API 访问历史消息（需 `ChannelMessage.Read.All`）

## 故障排查

### 常见问题

- **频道图片不显示：** 缺少 Graph 权限或管理员同意。卸载重新安装 Teams 应用并完全退出重启 Teams。
- **频道无回复：** 默认需 @提及。可设置 `channels.msteams.requireMention=false` 或针对团队/频道配置。
- **版本不匹配（Teams 显示旧 manifest）：** 移除后重新添加应用，完全退出 Teams 刷新缓存。
- **Webhook 401 未授权：** 手动测试时常见，表示端点可达但身份认证失败。使用 Azure Web Chat 测试更合适。

### Manifest 上传错误

- **"图标文件不能为空"：** Manifest 引用的图标文件大小为 0。请创建有效 PNG 图标（outline.png 32x32，color.png 192x192）。
- **"webApplicationInfo.Id 已被使用"：** 应用仍安装在其他团队/聊天中。先找到并卸载，或等待 5-10 分钟传播。
- **上传出错"出了点问题"：** 使用 [https://admin.teams.microsoft.com](https://admin.teams.microsoft.com) 上传，打开浏览器开发者工具（F12）→网络标签，查看响应体获得具体错误。
- **侧载失败：** 尝试"上传到组织应用目录"替代"上传自定义应用"，常能绕过侧载限制。

### RSC 权限无效

1. 核实 `webApplicationInfo.id` 与 Bot App ID 完全一致
2. 重新上传应用并重装团队/聊天中应用
3. 检查组织管理员是否禁用了 RSC 权限
4. 确认所用权限范围正确：团队为 `ChannelMessage.Read.Group`，群聊为 `ChatMessage.Read.Chat`

## 参考文档

- [创建 Azure Bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration) – Azure Bot 设置指南
- [Teams Developer Portal](https://dev.teams.microsoft.com/apps) – 创建/管理 Teams 应用
- [Teams 应用 manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema)
- [通过 RSC 接收频道消息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-messages-with-rsc)
- [RSC 权限参考](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams 机器人文件处理](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4)（频道/群组需 Graph 支持）
- [主动消息](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
